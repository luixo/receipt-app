import { TRPCError } from "@trpc/server";
import assert from "node:assert";
import { z } from "zod";

import { acceptNewIntentions } from "~web/handlers/debt-intentions/accept";
import { authProcedure } from "~web/handlers/trpc";
import { accountIdSchema, peerIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Accept account connection intention",
		description:
			"Accepts an inbound account connection intention from a given accountId, merging the matching peers and their debts.",
	})
	.input(
		z.strictObject({
			accountId: accountIdSchema,
			peerId: peerIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const peer = await ctx.database
			.selectFrom("peers")
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
			.leftJoin("accounts", (qb) =>
				qb.onRef("peers.connectedAccountId", "=", "accounts.id"),
			)
			.select([
				"peers.id",
				"accounts.email",
				"peers.ownerAccountId",
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
		if (peer.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${input.peerId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (peer.email && peer.reciprocalPeerId) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Peer "${input.peerId}" is already connected to an account with email "${peer.email}".`,
			});
		}
		const accounts = await database
			.selectFrom("accounts")
			.leftJoin("accountSettings", (jb) =>
				jb.onRef("accountSettings.accountId", "=", "accounts.id"),
			)
			.select([
				"accounts.id",
				"accounts.email",
				"accounts.avatarUrl",
				"accountSettings.manualAcceptDebts",
			])
			.where("accounts.id", "in", [input.accountId, ctx.auth.accountId])
			.limit(2)
			.execute();
		const targetAccount = accounts.find(
			(account) => account.id === input.accountId,
		);
		if (!targetAccount) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Account with id "${input.accountId}" does not exist.`,
			});
		}
		const intention = await database
			.selectFrom("peers")
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
			.select("peers.id as peerId")
			.where((eb) =>
				eb.and({
					"peers.ownerAccountId": targetAccount.id,
					"peers.connectedAccountId": ctx.auth.accountId,
				}),
			)
			.where("reciprocalPeers.id", "is", null)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention from account "${targetAccount.email}" not found.`,
			});
		}
		await database
			.updateTable("peers")
			.set({ connectedAccountId: targetAccount.id })
			.where((eb) =>
				eb.and({ ownerAccountId: ctx.auth.accountId, id: input.peerId }),
			)
			.executeTakeFirst();
		const selfAccount = accounts.find(
			(account) => account.id === ctx.auth.accountId,
		);
		assert.ok(selfAccount, "Expected to have self account in account list");
		const [outboundDebts, inboundDebts] = await Promise.all([
			targetAccount.manualAcceptDebts
				? []
				: database
						.selectFrom("debts")
						.where("debts.ownerAccountId", "=", ctx.auth.accountId)
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
			selfAccount.manualAcceptDebts
				? []
				: database
						.selectFrom("debts")
						.where("debts.ownerAccountId", "=", targetAccount.id)
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
				targetAccount.id,
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
				ctx.auth.accountId,
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
			email: targetAccount.email,
			id: targetAccount.id,
			avatarUrl: targetAccount.avatarUrl || undefined,
		};
	});
