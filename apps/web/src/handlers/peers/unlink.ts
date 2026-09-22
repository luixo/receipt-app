import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Unlink peer",
		description:
			"Disconnects a peer owned by the current account from its connected account, and vice versa.",
	})
	.input(
		z.strictObject({
			id: peerIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const peer = await database
			.selectFrom("peers as peersMine")
			.where("peersMine.id", "=", input.id)
			.leftJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "peersMine.connectedAccountId"),
			)
			.leftJoin("peers as peersTheir", (qb) =>
				qb
					.on("peersTheir.connectedAccountId", "=", ctx.auth.accountId)
					.onRef("peersTheir.ownerAccountId", "=", "accounts.id"),
			)
			.select([
				"peersMine.ownerAccountId",
				"accounts.id as connectedAccountId",
				"peersTheir.id as theirPeerId",
			])
			.limit(1)
			.executeTakeFirst();
		if (!peer) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No peer found by id "${input.id}".`,
			});
		}
		if (peer.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${input.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		const { connectedAccountId } = peer;
		if (!connectedAccountId) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${input.id}" doesn't have account connected to it.`,
			});
		}
		/* c8 ignore start */
		if (!peer.theirPeerId) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Peer "${input.id}" doesn't have a counterparty to unlink from.`,
			});
		}
		/* c8 ignore stop */
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("peers")
				.set({ connectedAccountId: null })
				.where("id", "=", input.id)
				.executeTakeFirst();
			await tx
				.updateTable("peers")
				.set({ connectedAccountId: null })
				.where("id", "=", peer.theirPeerId)
				.executeTakeFirst();
		});
	});
