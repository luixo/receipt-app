import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	limitSchema,
	offsetSchema,
	receiptsFiltersSchema,
	receiptsOrderBySchema,
} from "~app/utils/validation";
import type { ReceiptsId } from "~db/models";
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
type Output = GeneralOutput<ReceiptsId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	const foreignReceipts = getParticipantsReceipts(database, auth.accountId);
	const ownReceipts = getOwnReceipts(database, auth.accountId);

	const mergedReceipts = database
		.with("mergedReceipts", () => {
			const foreignReceiptsBuilder = foreignReceipts
				.groupBy(["receipts.id"])
				.select(["receipts.id", "receipts.issued"]);
			const ownReceiptsBuilder = ownReceipts
				.groupBy(["receipts.id"])
				.select(["receipts.id", "receipts.issued"]);
			if (!input.filters || typeof input.filters.ownedByMe !== "boolean") {
				return foreignReceiptsBuilder.union(ownReceiptsBuilder);
			}
			if (input.filters.ownedByMe) {
				return ownReceiptsBuilder;
			}
			return foreignReceiptsBuilder;
		})
		.selectFrom("mergedReceipts");

	const [receiptIds, receiptsCount] = await Promise.all([
		mergedReceipts
			.select("id")
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
		items: receiptIds.map(({ id }) => id),
	};
};

const queueReceiptList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, ReceiptsId, Output>(inputs, (values) =>
			fetchPage(ctx, values),
		),
);

export const procedure = authProcedure
	.input(inputSchema)
	.query(queueReceiptList);
