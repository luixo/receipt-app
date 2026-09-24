import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Unlink peer",
		description:
			"Disconnects a peer owned by the current  user from its connected  user, and vice versa.",
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
			.leftJoin("users", (qb) =>
				qb.onRef("users.id", "=", "peersMine.connectedUserId"),
			)
			.leftJoin("peers as peersTheir", (qb) =>
				qb
					.on("peersTheir.connectedUserId", "=", ctx.auth.userId)
					.onRef("peersTheir.ownerUserId", "=", "users.id"),
			)
			.select([
				"peersMine.ownerUserId",
				"users.id as connectedUserId",
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
		if (peer.ownerUserId !== ctx.auth.userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${input.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		const { connectedUserId } = peer;
		if (!connectedUserId) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${input.id}" doesn't have  user connected to it.`,
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
				.set({ connectedUserId: null })
				.where("id", "=", input.id)
				.executeTakeFirst();
			await tx
				.updateTable("peers")
				.set({ connectedUserId: null })
				.where("id", "=", peer.theirPeerId)
				.executeTakeFirst();
		});
	});
