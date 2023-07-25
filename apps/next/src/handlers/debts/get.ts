import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import {
	SyncStatus,
	getSyncStatus,
} from "next-app/handlers/debts-sync-intentions/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema, receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.union([
			z.strictObject({
				id: debtIdSchema,
			}),
			z.strictObject({
				receiptId: receiptIdSchema,
			}),
		]),
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const selfDebt = await database
			.selectFrom("debts")
			.where((eb) => {
				if ("id" in input) {
					return eb("debts.id", "=", input.id);
				}
				return eb("debts.receiptId", "=", input.receiptId);
			})
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.select([
				"debts.id",
				"debts.amount",
				"debts.currencyCode",
				"debts.note",
				"debts.timestamp",
				"debts.userId",
				"debts.lockedTimestamp",
				"debts.receiptId",
			])
			.executeTakeFirst();
		if (!selfDebt) {
			if (!("receiptId" in input)) {
				throw new trpc.TRPCError({
					code: "NOT_FOUND",
					message: `Debt ${input.id} does not exist or you don't have access to it.`,
				});
			}
			const foreignDebt = await database
				.selectFrom("debts")
				.where("debts.receiptId", "=", input.receiptId)
				.where("debts.ownerAccountId", "<>", ctx.auth.accountId)
				.innerJoin("users as usersTheir", (qb) =>
					qb
						.onRef("usersTheir.id", "=", "debts.userId")
						.on("usersTheir.connectedAccountId", "=", ctx.auth.accountId),
				)
				.innerJoin("users as usersMine", (qb) =>
					qb
						.onRef("usersMine.connectedAccountId", "=", "debts.ownerAccountId")
						.on("usersMine.ownerAccountId", "=", ctx.auth.accountId),
				)
				.select([
					"debts.id",
					"debts.amount",
					"debts.currencyCode",
					"debts.timestamp",
					"usersMine.id as userId",
					"debts.lockedTimestamp",
					"debts.receiptId",
				])
				.executeTakeFirst();
			if (!foreignDebt) {
				throw new trpc.TRPCError({
					code: "NOT_FOUND",
					message: `Debt for receipt ${input.receiptId} does not exist or you don't have access to it.`,
				});
			}
			const { amount, lockedTimestamp, ...debt } = foreignDebt;
			if (!lockedTimestamp) {
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: `You do not have access to debt for receipt ${input.receiptId}.`,
				});
			}
			return {
				...debt,
				amount: -Number(amount),
				locked: Boolean(lockedTimestamp),
				note: "",
				syncStatus: {
					type: "unsync",
					intention: {
						direction: "remote",
						timestamp: lockedTimestamp,
					},
				} satisfies SyncStatus,
			};
		}

		const syncStatus = await getSyncStatus(
			database,
			selfDebt.id,
			ctx.auth.accountId,
		);
		const { amount, lockedTimestamp, ...debt } = selfDebt;

		return {
			...debt,
			amount: Number(amount),
			locked: Boolean(lockedTimestamp),
			syncStatus,
		};
	});
