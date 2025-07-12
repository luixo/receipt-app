import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	debtsByUserFiltersSchema,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			userId: userIdSchema,
			cursor: offsetSchema,
			limit: limitSchema,
			filters: debtsByUserFiltersSchema.optional().default({}),
		}),
	)
	.query(async ({ input, ctx }) => {
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

		const currencySums = database
			.selectFrom("debts")
			.where((eb) =>
				eb.and({
					"debts.userId": input.userId,
					"debts.ownerAccountId": ctx.auth.accountId,
				}),
			)
			.select([
				"debts.currencyCode",
				database.fn.sum<string>("debts.amount").as("sum"),
			])
			.groupBy("debts.currencyCode");

		const debts = database
			.with("currencySums", () => currencySums)
			.selectFrom("debts")
			.where((eb) =>
				eb.and({
					"debts.userId": input.userId,
					"debts.ownerAccountId": ctx.auth.accountId,
				}),
			)
			.$if(!input.filters.showResolved, (qb) =>
				qb.where(
					"debts.currencyCode",
					"in",
					database
						.with("currencySums", () => currencySums)
						.selectFrom("currencySums")
						.select("currencyCode")
						.where("sum", "!=", "0"),
				),
			);

		const [paginatedDebts, totalCount] = await Promise.all([
			debts
				.select(["debts.id"])
				.orderBy(["debts.timestamp desc", "debts.id"])
				.offset(input.cursor)
				.limit(input.limit)
				.execute(),
			debts
				.select((eb) => eb.fn.count<string>("debts.id").as("count"))
				.executeTakeFirstOrThrow(),
		]);

		return {
			count: parseInt(totalCount.count, 10),
			cursor: input.cursor,
			items: paginatedDebts.map((debt) => debt.id),
		};
	});
