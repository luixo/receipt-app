import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AccountId, PeerId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";

const fetchPeers = async (
	{ database, auth }: AuthorizedContext,
	ids: PeerId[],
) =>
	database
		.selectFrom("peers")
		.leftJoin("accounts", (qb) =>
			qb.onRef("connectedAccountId", "=", "accounts.id"),
		)
		.leftJoin("peers as reciprocalPeers", (qb) =>
			qb
				.onRef(
					"reciprocalPeers.ownerAccountId",
					"=",
					"peers.connectedAccountId",
				)
				.onRef(
					"reciprocalPeers.connectedAccountId",
					"=",
					"peers.ownerAccountId",
				),
		)
		.where("peers.id", "in", ids)
		.where("peers.ownerAccountId", "=", auth.accountId)
		.select([
			"peers.id",
			"peers.name",
			"peers.publicName",
			"accounts.id as accountId",
			"accounts.avatarUrl",
			"accounts.email",
			"reciprocalPeers.id as reciprocalPeerId",
		])
		.execute();

const mapPeer = (peer: Awaited<ReturnType<typeof fetchPeers>>[number]) => ({
	id: peer.id,
	name: peer.name,
	publicName: peer.publicName === null ? undefined : peer.publicName,
	connectedAccount:
		peer.email === null ||
		peer.accountId === null ||
		peer.reciprocalPeerId === null
			? undefined
			: ({
					id: peer.accountId,
					email: peer.email,
					avatarUrl: peer.avatarUrl || undefined,
				} as {
					id: AccountId;
					email: string;
					avatarUrl?: string;
				}),
});

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
		const matchedPeer = peers.find((peer) => peer.id === input.id);
		if (!matchedPeer) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `No peer found by id "${input.id}".`,
			});
		}
		return mapPeer(matchedPeer);
	});
});

export const procedure = authProcedure
	.meta({
		title: "Get peer",
		description: "Returns a peer by id owned by the current account.",
	})
	.input(z.strictObject({ id: peerIdSchema }))
	.query(queuePeer);
