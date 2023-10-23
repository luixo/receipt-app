import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			userId: userIdSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.where("users.id", "=", input.userId)
			.select("users.ownerAccountId")
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.userId} is not owned by ${ctx.auth.accountId}.`,
			});
		}

		const debts = await database
			.selectFrom("debts")
			.where("debts.userId", "=", input.userId)
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.leftJoin("debts as theirDebts", (qb) =>
				qb
					.onRef("theirDebts.id", "=", "debts.id")
					.onRef("theirDebts.ownerAccountId", "<>", "debts.ownerAccountId"),
			)
			.select([
				"debts.id",
				"debts.currencyCode",
				"debts.amount",
				"debts.timestamp",
				"debts.created",
				"debts.note",
				"debts.lockedTimestamp",
				"debts.receiptId",
				"theirDebts.ownerAccountId as theirOwnerAccountId",
				"theirDebts.lockedTimestamp as theirLockedTimestamp",
			])
			.orderBy("timestamp", "desc")
			.orderBy("debts.id")
			.execute();

		return debts.map(
			({
				amount,
				lockedTimestamp,
				theirOwnerAccountId,
				theirLockedTimestamp,
				...debt
			}) => ({
				...debt,
				amount: Number(amount),
				lockedTimestamp: lockedTimestamp || undefined,
				their: theirOwnerAccountId
					? {
							lockedTimestamp: theirLockedTimestamp || undefined,
					  }
					: undefined,
			}),
		);
	});
