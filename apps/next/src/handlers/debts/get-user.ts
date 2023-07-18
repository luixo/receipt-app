import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getLockedStatus } from "next-app/handlers/debts-sync-intentions/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			userId: userIdSchema,
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const user = await database
			.selectFrom("users")
			.where("users.id", "=", input.userId)
			.select("users.ownerAccountId")
			.executeTakeFirst();
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.userId} is not owned by ${ctx.auth.accountId}.`,
			});
		}

		const debts = await database
			.selectFrom("debts")
			.where("debts.userId", "=", input.userId)
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.select([
				"id",
				"currencyCode",
				"amount",
				"timestamp",
				"created",
				"note",
				"lockedTimestamp",
				"receiptId",
			])
			.orderBy("timestamp", "desc")
			.orderBy("id")
			.execute();

		const statuses = await Promise.all(
			debts.map((debt) =>
				getLockedStatus(database, debt.id, ctx.auth.accountId)
			)
		);

		return debts.map(({ amount, lockedTimestamp, ...debt }, index) => {
			const [status, intentionDirection] = statuses[index]!;
			return {
				...debt,
				locked: Boolean(lockedTimestamp),
				amount: Number(amount),
				status,
				intentionDirection,
			};
		});
	});
