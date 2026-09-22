import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import {
	directionSchema,
	limitSchema,
	offsetSchema,
	queryNoMinSchema,
} from "~app/utils/validation";
import type { PeerId } from "~db/ids";
import { SIMILARTY_THRESHOLD } from "~utils/server/trigram";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema, receiptIdSchema } from "~web/handlers/validation";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	input: queryNoMinSchema,
	cursor: offsetSchema,
	limit: limitSchema,
	filterIds: z.array(peerIdSchema).optional(),
	options: z
		.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("not-connected"),
			}),
			z.strictObject({
				type: z.literal("not-connected-receipt"),
				receiptId: receiptIdSchema,
			}),
		])
		.optional(),
	direction: directionSchema,
});
type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<PeerId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	let filterIds = [...(input.filterIds || []), auth.accountId as PeerId];
	const cursor = input.cursor || 0;
	const options = input.options || { type: "all" };
	if (options.type === "not-connected-receipt") {
		const { receiptId } = options;
		const receipt = await database
			.selectFrom("receipts")
			.select(["id", "ownerAccountId"])
			.where("id", "=", receiptId)
			.limit(1)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${receiptId}" does not exist.`,
			});
		}
		const accessRole = await getAccessRole(database, receipt, auth.accountId);
		if (!accessRole) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to view receipt "${receiptId}".`,
			});
		}
		const peerParticipants = await database
			.selectFrom("receiptParticipants")
			.innerJoin("peers", (jb) =>
				jb.onRef("peers.id", "=", "receiptParticipants.peerId"),
			)
			.where("receiptParticipants.receiptId", "=", options.receiptId)
			.select("peers.id")
			.execute();
		filterIds = [
			...new Set([...filterIds, ...peerParticipants.map(({ id }) => id)]),
		];
	}
	const fuzzyMatchedPeersExpression = database
		.selectFrom("peers")
		.$if(filterIds.length !== 0, (qb) =>
			qb.where("peers.id", "not in", filterIds),
		)
		.where("peers.ownerAccountId", "=", auth.accountId)
		.$if(options.type === "not-connected", (qb) =>
			qb.where("peers.connectedAccountId", "is", null),
		)
		.$if(input.input.length < 3, (qb) =>
			qb.where("name", "ilike", `%${input.input}%`),
		)
		.$if(input.input.length >= 3, (qb) =>
			qb.where(
				sql`strict_word_similarity(${input.input}, name)`.$castTo<number>(),
				">=",
				SIMILARTY_THRESHOLD,
			),
		);
	const [fuzzyMatchedPeers, totalCountPeers] = await Promise.all([
		fuzzyMatchedPeersExpression
			.$if(input.input.length < 3, (qb) => qb.orderBy("name"))
			.$if(input.input.length >= 3, (qb) =>
				qb.orderBy(
					sql`word_similarity(${input.input}, name)`.$castTo(),
					"desc",
				),
			)
			.select(["peers.id"])
			// Stable order for peers with the same name
			.orderBy("peers.id")
			.offset(cursor)
			.limit(input.limit)
			.execute(),
		fuzzyMatchedPeersExpression
			.select([(eb) => eb.fn.count<number>("peers.id").as("count")])
			.executeTakeFirstOrThrow(),
	]);
	return {
		count: totalCountPeers.count,
		cursor,
		items: fuzzyMatchedPeers.map(({ id }) => id),
	};
};

const queueSuggestPeerList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, PeerId, Output>(inputs, (values) =>
			fetchPage(ctx, values),
		),
);

export const procedure = authProcedure
	.meta({
		title: "Suggest peers",
		description:
			"Returns a page of the current account's peerIds fuzzy-matched by name against a search query.",
	})
	.input(inputSchema)
	.query(queueSuggestPeerList);
