import { TRPCError } from "@trpc/server";
import z from "zod";

import { limitSchema, offsetSchema } from "~app/utils/validation";
import type { ReceiptId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { getParticipantsReceipts } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	peerId: peerIdSchema,
	cursor: offsetSchema,
	limit: limitSchema,
});

type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<ReceiptId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	const peer = await database
		.selectFrom("peers")
		.where("peers.id", "=", input.peerId)
		.select(["peers.ownerAccountId", "peers.connectedAccountId"])
		.limit(1)
		.executeTakeFirst();
	if (!peer) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Peer "${input.peerId}" does not exist.`,
		});
	}
	if (peer.ownerAccountId !== auth.accountId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Peer "${input.peerId}" is not owned by "${auth.email}".`,
		});
	}

	const ownReceipts = database
		.selectFrom("receipts")
		.where("receipts.ownerAccountId", "=", auth.accountId)
		.innerJoin("receiptParticipants", (jb) =>
			jb
				.onRef("receiptParticipants.receiptId", "=", "receipts.id")
				.on("receiptParticipants.peerId", "=", input.peerId),
		)
		.select(["receipts.id as id", "receipts.issued as issued"]);

	const mergedReceipts = database.with("mergedReceipts", () => {
		const { connectedAccountId } = peer;
		if (!connectedAccountId) {
			return ownReceipts;
		}
		const peerOwnedReceipts = getParticipantsReceipts(database, auth.accountId)
			.where("receipts.ownerAccountId", "=", connectedAccountId)
			.select(["receipts.id as id", "receipts.issued as issued"]);
		const thirdPartyReceipts = getParticipantsReceipts(database, auth.accountId)
			.where("receipts.ownerAccountId", "!=", connectedAccountId)
			.where((eb) =>
				eb.exists(
					eb
						.selectFrom("receiptParticipants")
						.innerJoin("peers", (jb) =>
							jb.onRef("peers.id", "=", "receiptParticipants.peerId"),
						)
						.whereRef("receiptParticipants.receiptId", "=", "receipts.id")
						.where("peers.connectedAccountId", "=", connectedAccountId)
						.select("receiptParticipants.receiptId"),
				),
			)
			.select(["receipts.id as id", "receipts.issued as issued"]);
		return ownReceipts.unionAll(peerOwnedReceipts).unionAll(thirdPartyReceipts);
	});
	const merged = mergedReceipts.selectFrom("mergedReceipts");

	const [receipts, receiptsCount] = await Promise.all([
		merged
			.select(["id", "issued"])
			.orderBy("mergedReceipts.issued", "desc")
			.orderBy("mergedReceipts.id")
			.offset(input.cursor)
			.limit(input.limit)
			.execute(),
		merged
			.select((eb) => eb.fn.count<number>("mergedReceipts.id").as("amount"))
			.executeTakeFirstOrThrow(
				/* c8 ignore start */
				() =>
					new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Unexpected having empty "amount" in "receipts.getByPeerPaged" handler`,
					}),
				/* c8 ignore stop */
			),
	]);

	return {
		count: receiptsCount.amount,
		cursor: input.cursor,
		items: receipts.map(({ id }) => id),
	};
};

const queueReceiptList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, ReceiptId, Output>(inputs, (value) =>
			fetchPage(ctx, value),
		),
);

export const procedure = authProcedure
	.meta({
		title: "Get receipts by peer, paged",
		description:
			"Returns a page of receipt ids the account has access to where the given peer participates: own receipts with the peer, foreign receipts owned by the peer, and third-party receipts with both.",
	})
	.input(inputSchema)
	.query(queueReceiptList);
