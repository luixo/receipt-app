import { TRPCError } from "@trpc/server";
import assert from "node:assert";
import { z } from "zod";

import { acceptNewIntentions } from "~web/handlers/debt-intentions/accept";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema, userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Accept  user connection intention",
		description:
			"Accepts an inbound  user connection intention from a given userId, merging the matching peers and their debts.",
	})
	.input(
		z.strictObject({
			userId: userIdSchema,
			peerId: peerIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const peer = await ctx.database
			.selectFrom("peers")
			.leftJoin("peers as reciprocalPeers", (qb) =>
				qb
					.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
					.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
			)
			.leftJoin("users", (qb) =>
				qb.onRef("peers.connectedUserId", "=", "users.id"),
			)
			.select([
				"peers.id",
				"users.email",
				"peers.ownerUserId",
				"reciprocalPeers.id as reciprocalPeerId",
			])
			.where("peers.id", "=", input.peerId)
			.limit(1)
			.executeTakeFirst();
		if (!peer) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${input.peerId}" does not exist.`,
			});
		}
		if (peer.ownerUserId !== ctx.auth.userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${input.peerId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (peer.email && peer.reciprocalPeerId) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Peer "${input.peerId}" is already connected to an  user with email "${peer.email}".`,
			});
		}
		const users = await database
			.selectFrom("users")
			.leftJoin("userSettings", (jb) =>
				jb.onRef("userSettings.userId", "=", "users.id"),
			)
			.select([
				"users.id",
				"users.email",
				"users.avatarUrl",
				"userSettings.manualAcceptDebts",
			])
			.where("users.id", "in", [input.userId, ctx.auth.userId])
			.limit(2)
			.execute();
		const targetUser = users.find((user) => user.id === input.userId);
		if (!targetUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User with id "${input.userId}" does not exist.`,
			});
		}
		const intention = await database
			.selectFrom("peers")
			.leftJoin("peers as reciprocalPeers", (qb) =>
				qb
					.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
					.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
			)
			.select("peers.id as peerId")
			.where((eb) =>
				eb.and({
					"peers.ownerUserId": targetUser.id,
					"peers.connectedUserId": ctx.auth.userId,
				}),
			)
			.where("reciprocalPeers.id", "is", null)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention from  user "${targetUser.email}" not found.`,
			});
		}
		await database
			.updateTable("peers")
			.set({ connectedUserId: targetUser.id })
			.where((eb) => eb.and({ ownerUserId: ctx.auth.userId, id: input.peerId }))
			.executeTakeFirst();
		const selfUser = users.find((user) => user.id === ctx.auth.userId);
		assert.ok(selfUser, "Expected to have self  user in  user list");
		const [outboundDebts, inboundDebts] = await Promise.all([
			targetUser.manualAcceptDebts
				? []
				: database
						.selectFrom("debts")
						.where("debts.ownerUserId", "=", ctx.auth.userId)
						.where("debts.peerId", "=", input.peerId)
						.select([
							"debts.id",
							"debts.amount",
							"debts.currencyCode",
							"debts.note",
							"debts.receiptId",
							"debts.timestamp",
						])
						.execute(),
			selfUser.manualAcceptDebts
				? []
				: database
						.selectFrom("debts")
						.where("debts.ownerUserId", "=", targetUser.id)
						.where("debts.peerId", "=", intention.peerId)
						.select([
							"debts.id",
							"debts.amount",
							"debts.currencyCode",
							"debts.note",
							"debts.receiptId",
							"debts.timestamp",
						])
						.execute(),
		]);
		await Promise.all([
			acceptNewIntentions(
				ctx,
				targetUser.id,
				outboundDebts.map((debt) => ({
					id: debt.id,
					currencyCode: debt.currencyCode,
					amount: debt.amount,
					timestamp: debt.timestamp,
					note: debt.note,
					receiptId: debt.receiptId,
					foreignPeerId: intention.peerId,
					selfId: null,
				})),
			),
			acceptNewIntentions(
				ctx,
				ctx.auth.userId,
				inboundDebts.map((debt) => ({
					id: debt.id,
					currencyCode: debt.currencyCode,
					amount: debt.amount,
					timestamp: debt.timestamp,
					note: debt.note,
					receiptId: debt.receiptId,
					foreignPeerId: input.peerId,
					selfId: null,
				})),
			),
		]);
		return {
			email: targetUser.email,
			id: targetUser.id,
			avatarUrl: targetUser.avatarUrl || undefined,
		};
	});
