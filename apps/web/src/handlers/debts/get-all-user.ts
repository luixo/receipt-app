import { TRPCError } from "@trpc/server";
import z from "zod/v4";

import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			userId: userIdSchema,
		}),
	)
	.query(async ({ ctx, input }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.where("users.id", "=", input.userId)
			.select("users.ownerAccountId")
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

		const debts = await database
			.selectFrom("debts")
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.where("debts.userId", "=", input.userId)
			.select([
				"debts.currencyCode",
				database.fn.sum<string>("debts.amount").as("sum"),
			])
			.orderBy("debts.currencyCode")
			.groupBy(["debts.currencyCode"])
			.execute();

		return debts.map(({ currencyCode, sum }) => ({
			currencyCode,
			sum: parseFloat(sum),
		}));
	});
