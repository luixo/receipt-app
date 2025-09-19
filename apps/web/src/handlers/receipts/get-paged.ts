import { TRPCError } from "@trpc/server";
import type { ExpressionBuilder } from "kysely";
import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod";

import {
	limitSchema,
	offsetSchema,
	receiptsFiltersSchema,
	receiptsOrderBySchema,
} from "~app/utils/validation";
import type { ReceiptItemsId, ReceiptsId } from "~db/models";
import type { ReceiptsDatabase } from "~db/types";
import type { Interval } from "~utils/array";
import { mergeIntervals } from "~utils/array";
import {
	SIMILARTY_THRESHOLD,
	trigramSimilarity,
	trigramsForString,
} from "~utils/trigram";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import {
	getOwnReceipts,
	getParticipantsReceipts,
} from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	cursor: offsetSchema,
	limit: limitSchema,
	orderBy: receiptsOrderBySchema,
	filters: receiptsFiltersSchema.optional(),
});

type Input = z.infer<typeof inputSchema>;
type OutputItem = {
	id: ReceiptsId;
	highlights: Interval[];
	matchedItems: {
		id: ReceiptItemsId;
		highlights: Interval[];
	}[];
};
type Output = GeneralOutput<OutputItem> & { count: number };

const getTrigramHighlight = ({
	query,
	target,
}: {
	query: string;
	target: string;
}) => {
	const words = target.split(" ").map((word, index, allWords) => ({
		word,
		startIndex:
			/* c8 ignore next */
			allWords.slice(0, index).join(" ").length + (index === 0 ? 0 : 1),
	}));

	return mergeIntervals(
		words.flatMap(({ word, startIndex }) => {
			if (
				query
					.split(" ")
					.every(
						(queryPart) =>
							trigramSimilarity(queryPart, word) < SIMILARTY_THRESHOLD,
					)
			) {
				return [];
			}
			const filterQueryTrigrams = Array.from(trigramsForString(query))
				.map((trigram) => trigram.trim())
				.filter((trigram) => trigram.length >= 3);
			/* c8 ignore start */
			if (filterQueryTrigrams.length === 0) {
				return [];
			}
			/* c8 ignore stop */
			const matches = [
				...word.matchAll(
					new RegExp(`(?=(${filterQueryTrigrams.join("|")}))`, "giu"),
				),
			];
			return matches.map<Interval>((match) => [
				startIndex + match.index,
				// This is non-consuming RegExp hence 2nd argument
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				startIndex + match.index + match[1]!.length,
			]);
		}),
		true,
	);
};

const itemSimilarity = (query: string, lookupColumn: string) =>
	sql<number>`similarity(${query}, ${sql.id(...lookupColumn.split("."))})`;

const selectFields = (
	eb: ExpressionBuilder<ReceiptsDatabase, "receipts" | "receiptItems">,
	query: string | undefined,
) => {
	if (!query) {
		return [
			sql<number>`0`.as("similarity"),
			sql`'[]'::jsonb`.$castTo<Item[]>().as("matchedItems"),
		] as const;
	}
	const itemsQueryBuilder = eb
		.selectFrom("receiptItems")
		.select([
			"receiptItems.id",
			"receiptItems.name",
			itemSimilarity(query, "receiptItems.name").as("similarity"),
		])
		.whereRef("receiptItems.receiptId", "=", "receipts.id")
		.where((qb) =>
			qb(itemSimilarity(query, "receiptItems.name"), ">=", SIMILARTY_THRESHOLD),
		)
		.orderBy(itemSimilarity(query, "receiptItems.name"), "desc");
	type Item = NonNullable<(typeof itemsQueryBuilder)["expressionType"]>;
	const nameSimilarity = itemSimilarity(query, "receipts.name");
	const maxItemSimilarity = sql<number>`coalesce(${eb.fn.max(itemSimilarity(query, "receiptItems.name"))}, 0::float8)`;
	return [
		sql<number>`(${nameSimilarity} + ${maxItemSimilarity})`.as("similarity"),
		jsonArrayFrom(itemsQueryBuilder).$castTo<Item[]>().as("matchedItems"),
	] as const;
};

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	const foreignReceipts = getParticipantsReceipts(database, auth.accountId);
	const ownReceipts = getOwnReceipts(database, auth.accountId);

	const mergedReceipts = database
		.with("mergedReceipts", () => {
			const query = input.filters?.query;

			const baseGroupBy = [
				"receipts.id",
				"receipts.name",
				"receipts.issued",
			] as const;
			const baseSelect = [
				"receipts.id",
				"receipts.name",
				"receipts.issued",
			] as const;

			const ownBuilder = ownReceipts
				.leftJoin("receiptItems", (qb) =>
					qb.onRef("receiptItems.receiptId", "=", "receipts.id"),
				)
				.select((eb) => [...baseSelect, ...selectFields(eb, query)])
				.groupBy(baseGroupBy);

			const foreignBuilder = foreignReceipts
				.leftJoin("receiptItems", (qb) =>
					qb.onRef("receiptItems.receiptId", "=", "receipts.id"),
				)
				.select((eb) => [...baseSelect, ...selectFields(eb, query)])
				.groupBy(baseGroupBy);

			if (!input.filters || typeof input.filters.ownedByMe !== "boolean") {
				return ownBuilder.unionAll(foreignBuilder);
			}
			if (input.filters.ownedByMe) {
				return ownBuilder;
			}
			return foreignBuilder;
		})
		.selectFrom("mergedReceipts")
		.$if(Boolean(input.filters?.query), (sqb) =>
			sqb.where("mergedReceipts.similarity", ">=", SIMILARTY_THRESHOLD),
		);

	const [receipts, receiptsCount] = await Promise.all([
		mergedReceipts
			.select(["id", "name", "matchedItems", "similarity"])
			.orderBy("mergedReceipts.similarity", "desc")
			// Stable order for receipts with the same date
			.orderBy(
				"mergedReceipts.issued",
				input.orderBy === "date-asc" ? "asc" : "desc",
			)
			.orderBy("mergedReceipts.id")
			.offset(input.cursor)
			.limit(input.limit)
			.execute(),
		mergedReceipts
			.select((eb) => eb.fn.count<string>("mergedReceipts.id").as("amount"))
			.executeTakeFirstOrThrow(
				/* c8 ignore start */
				() =>
					new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Unexpected having empty "amount" in "receipts.getPaged" handler`,
					}),
				/* c8 ignore stop */
			),
	]);

	return {
		count: parseInt(receiptsCount.amount, 10),
		cursor: input.cursor,
		items: receipts.map(({ id, name, matchedItems }) => ({
			id,
			highlights: input.filters?.query
				? getTrigramHighlight({ query: input.filters.query, target: name })
				: [],
			matchedItems: matchedItems.map((item) => ({
				id: item.id,
				highlights: input.filters?.query
					? getTrigramHighlight({
							query: input.filters.query,
							target: item.name,
							/* c8 ignore start */
						})
					: [],
				/* c8 ignore stop */
			})),
		})),
	};
};

const queueReceiptList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, OutputItem, Output>(inputs, (values) =>
			fetchPage(ctx, values),
		),
);

export const procedure = authProcedure
	.input(inputSchema)
	.query(queueReceiptList);
