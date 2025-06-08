import { TRPCError } from "@trpc/server";
import assert from "node:assert";
import { z } from "zod/v4";

import { acceptNewIntentions } from "~web/handlers/debt-intentions/accept";
import { authProcedure } from "~web/handlers/trpc";
import { accountIdSchema, userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			accountId: accountIdSchema,
			userId: userIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await ctx.database
			.selectFrom("users")
			.leftJoin("accounts", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accounts.id"),
			)
			.select(["users.id", "accounts.email", "users.ownerAccountId"])
			.where("users.id", "=", input.userId)
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (user.email) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `User "${input.userId}" is already connected to an account with email "${user.email}".`,
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
			.selectFrom("accountConnectionsIntentions")
			.select("userId")
			.where((eb) =>
				eb.and({
					accountId: targetAccount.id,
					targetAccountId: ctx.auth.accountId,
				}),
			)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention from account "${targetAccount.email}" not found.`,
			});
		}
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("users")
				.set({ connectedAccountId: ctx.auth.accountId })
				.where((eb) =>
					eb.and({ ownerAccountId: targetAccount.id, id: intention.userId }),
				)
				.executeTakeFirst();
			await tx
				.updateTable("users")
				.set({ connectedAccountId: targetAccount.id })
				.where((eb) =>
					eb.and({ ownerAccountId: ctx.auth.accountId, id: input.userId }),
				)
				.executeTakeFirst();
			await tx
				.deleteFrom("accountConnectionsIntentions")
				.where((eb) =>
					eb.and({
						accountId: targetAccount.id,
						targetAccountId: ctx.auth.accountId,
					}),
				)
				.executeTakeFirst();
		});
		const selfAccount = accounts.find(
			(account) => account.id === ctx.auth.accountId,
		);
		assert(selfAccount, "Expected to have self account in account list");
		const [outboundDebts, inboundDebts] = await Promise.all([
			!targetAccount.manualAcceptDebts
				? database
						.selectFrom("debts")
						.where("debts.ownerAccountId", "=", ctx.auth.accountId)
						.where("debts.userId", "=", input.userId)
						.select([
							"debts.id",
							"debts.amount",
							"debts.currencyCode",
							"debts.note",
							"debts.receiptId",
							"debts.timestamp",
						])
						.execute()
				: [],
			!selfAccount.manualAcceptDebts
				? database
						.selectFrom("debts")
						.where("debts.ownerAccountId", "=", targetAccount.id)
						.where("debts.userId", "=", intention.userId)
						.select([
							"debts.id",
							"debts.amount",
							"debts.currencyCode",
							"debts.note",
							"debts.receiptId",
							"debts.timestamp",
						])
						.execute()
				: [],
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
					foreignUserId: intention.userId,
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
					foreignUserId: input.userId,
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
