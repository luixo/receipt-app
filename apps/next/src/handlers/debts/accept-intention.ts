import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: debtIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const debt = await database
			.selectFrom("debts as theirDebts")
			.where("theirDebts.id", "=", input.id)
			.where("theirDebts.ownerAccountId", "<>", ctx.auth.accountId)
			.innerJoin("users", (qb) =>
				qb
					.onRef("users.connectedAccountId", "=", "theirDebts.ownerAccountId")
					.on("users.ownerAccountId", "=", ctx.auth.accountId),
			)
			.leftJoin("debts as selfDebts", (qb) =>
				qb
					.onRef("selfDebts.id", "=", "theirDebts.id")
					.on("selfDebts.ownerAccountId", "=", ctx.auth.accountId),
			)
			.select([
				"theirDebts.ownerAccountId",
				"theirDebts.lockedTimestamp",
				"theirDebts.amount",
				"theirDebts.note",
				"theirDebts.timestamp",
				"theirDebts.currencyCode",
				"theirDebts.receiptId",
				"selfDebts.lockedTimestamp as selfLockedTimestamp",
				"users.id as foreignUserId",
			])
			.executeTakeFirst();
		if (!debt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention for debt ${input.id} is not found.`,
			});
		}
		if (!debt.lockedTimestamp) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Counterparty debt ${input.id} is not expected to be in sync.`,
			});
		}
		if (debt.selfLockedTimestamp) {
			const nextAmount = Number(debt.amount) * -1;
			const result = await database
				.updateTable("debts")
				.where("id", "=", input.id)
				.where("ownerAccountId", "=", ctx.auth.accountId)
				.set({
					amount: nextAmount.toString(),
					currencyCode: debt.currencyCode,
					timestamp: debt.timestamp,
					lockedTimestamp: debt.lockedTimestamp,
				})
				.returning("debts.created")
				.executeTakeFirstOrThrow();

			return { created: result.created };
		}
		const createdTimestamp = new Date();
		const nextAmount = Number(debt.amount) * -1;
		await database
			.insertInto("debts")
			.values({
				id: input.id,
				ownerAccountId: ctx.auth.accountId,
				userId: debt.foreignUserId,
				currencyCode: debt.currencyCode,
				amount: nextAmount.toString(),
				timestamp: debt.timestamp,
				created: createdTimestamp,
				note: debt.note,
				lockedTimestamp: debt.lockedTimestamp,
				receiptId: debt.receiptId,
			})
			.execute();
		return { created: createdTimestamp };
	});
