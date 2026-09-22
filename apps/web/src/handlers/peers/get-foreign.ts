import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AccountId, PeerId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { getParticipantsReceipts } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";

// We allow account fetch foreign peers
// In case they share the same receipt (as participant or as payer)
const fetchPeers = async (ctx: AuthorizedContext, ids: PeerId[]) =>
	ctx.database
		.with("mergedReceipts", (qc) =>
			getParticipantsReceipts(qc, ctx.auth.accountId)
				.groupBy("receipts.id")
				.select("receipts.id"),
		)
		.with("mergedParticipants", (qc) =>
			qc
				.selectFrom("receiptParticipants")
				.innerJoin("mergedReceipts", (qb) =>
					qb.onRef("receiptParticipants.receiptId", "=", "mergedReceipts.id"),
				)
				.groupBy("receiptParticipants.peerId")
				.select("receiptParticipants.peerId"),
		)
		.selectFrom("peers as peersTheir")
		.where("peersTheir.id", "in", ids)
		.innerJoin("mergedParticipants", (qb) =>
			qb.onRef("peersTheir.id", "=", "mergedParticipants.peerId"),
		)
		.leftJoin("accounts", (qb) =>
			qb.onRef("peersTheir.connectedAccountId", "=", "accounts.id"),
		)
		.leftJoin("peers as peersMine", (qb) =>
			qb
				.onRef(
					"peersMine.connectedAccountId",
					"=",
					"peersTheir.connectedAccountId",
				)
				.on("peersMine.ownerAccountId", "=", ctx.auth.accountId),
		)
		.select([
			"peersMine.id as mineId",
			"peersMine.name as mineName",
			"peersMine.publicName as minePublicName",
			"accounts.id as accountId",
			"accounts.email",
			"accounts.avatarUrl",
			"peersTheir.id as theirId",
			"peersTheir.name as theirName",
			"peersTheir.publicName as theirPublicName",
			"peersTheir.ownerAccountId",
		])
		.groupBy([
			"peersMine.id",
			"peersMine.name",
			"peersMine.publicName",
			"accounts.id",
			"accounts.email",
			"accounts.avatarUrl",
			"peersTheir.id",
			"peersTheir.name",
			"peersTheir.publicName",
			"peersTheir.ownerAccountId",
		])
		.execute();

// Excessive function is needed to properly infer return types
const getForeignPeer = (
	peer: Awaited<ReturnType<typeof fetchPeers>>[number],
) => ({
	remoteId: peer.theirId,
	name: peer.theirPublicName || peer.theirName,
});

const mapPeer = (peer: Awaited<ReturnType<typeof fetchPeers>>[number]) => {
	if (peer.mineId && peer.mineName && peer.email && peer.accountId) {
		return {
			id: peer.mineId,
			name: peer.mineName,
			publicName:
				peer.minePublicName === null ? undefined : peer.minePublicName,
			connectedAccount: {
				id: peer.accountId,
				email: peer.email,
				avatarUrl: peer.avatarUrl || undefined,
			} as
				| {
						id: AccountId;
						email: string;
						avatarUrl?: string;
				  }
				| undefined,
		};
	}
	return getForeignPeer(peer);
};

const queuePeer = queueCallFactory<
	AuthorizedContext,
	{ id: PeerId },
	ReturnType<typeof mapPeer>
>((ctx) => async (inputs) => {
	const peers = await fetchPeers(
		ctx,
		inputs.map(({ id }) => id),
	);
	return inputs.map((input) => {
		const matchedPeer = peers.find((peer) => peer.theirId === input.id);
		if (!matchedPeer) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `No peer found by id "${input.id}" or you don't have access to it.`,
			});
		}
		return mapPeer(matchedPeer);
	});
});

export const procedure = authProcedure
	.meta({
		title: "Get foreign peer",
		description:
			"Returns a peer by id owned by another account, provided they share a receipt with the current account.",
	})
	.input(z.strictObject({ id: peerIdSchema }))
	.query(queuePeer);
