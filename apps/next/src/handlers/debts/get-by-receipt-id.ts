import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getLockedStatus } from "next-app/handlers/debts-sync-intentions/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const selfDebt = await database
			.selectFrom("debts")
			.where("debts.receiptId", "=", input.receiptId)
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
			const foreignDebt = await database
				.selectFrom("debts")
				.where("debts.receiptId", "=", input.receiptId)
				.where("debts.ownerAccountId", "<>", ctx.auth.accountId)
				.innerJoin("users as usersTheir", (qb) =>
					qb
						.onRef("usersTheir.id", "=", "debts.userId")
						.on("usersTheir.connectedAccountId", "=", ctx.auth.accountId)
				)
				.innerJoin("users as usersMine", (qb) =>
					qb
						.onRef("usersMine.connectedAccountId", "=", "debts.ownerAccountId")
						.on("usersMine.ownerAccountId", "=", ctx.auth.accountId)
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
				return null;
			}
			const { amount, lockedTimestamp, ...debt } = foreignDebt;
			return {
				...debt,
				amount: -Number(amount),
				locked: Boolean(lockedTimestamp),
				note: "",
				status: "unsync" as const,
				intentionDirection: "remote" as const,
			};
		}

		const [status, intentionDirection] = await getLockedStatus(
			database,
			selfDebt.id,
			ctx.auth.accountId
		);
		const { amount, lockedTimestamp, ...debt } = selfDebt;

		return {
			...debt,
			amount: Number(amount),
			locked: Boolean(lockedTimestamp),
			status,
			intentionDirection,
		};
	});
