import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { debtIdSchema } from "~web/handlers/validation";

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
			.where((eb) =>
				eb("theirDebts.id", "=", input.id).and(
					"theirDebts.ownerAccountId",
					"<>",
					ctx.auth.accountId,
				),
			)
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
				"selfDebts.id as selfId",
				"selfDebts.lockedTimestamp as selfLockedTimestamp",
				"users.id as foreignUserId",
			])
			.executeTakeFirst();
		if (!debt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention for debt "${input.id}" is not found.`,
			});
		}
		if (!debt.lockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Counterparty debt "${input.id}" is not expected to be in sync.`,
			});
		}
		if (!debt.selfId) {
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
					createdAt: createdTimestamp,
					note: debt.note,
					lockedTimestamp: debt.lockedTimestamp,
					receiptId: debt.receiptId,
				})
				.execute();
			return { createdAt: createdTimestamp };
		}
		if (!debt.selfLockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Debt "${input.id}" is not expected to be in sync.`,
			});
		}
		if (debt.selfLockedTimestamp.valueOf() > debt.lockedTimestamp.valueOf()) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `The counterparty is intended to accept debt "${input.id}" as our timestamp is more fresh.`,
			});
		}
		const nextAmount = Number(debt.amount) * -1;
		const result = await database
			.updateTable("debts")
			.where((eb) =>
				eb.and({
					id: input.id,
					ownerAccountId: ctx.auth.accountId,
				}),
			)
			.set({
				amount: nextAmount.toString(),
				currencyCode: debt.currencyCode,
				timestamp: debt.timestamp,
				lockedTimestamp: debt.lockedTimestamp,
			})
			.returning("debts.createdAt")
			.executeTakeFirstOrThrow();

		return { createdAt: result.createdAt };
	});
