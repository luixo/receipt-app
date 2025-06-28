import { z } from "zod/v4";

import {
	debtsFiltersSchema,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.input(
		z.strictObject({
			cursor: offsetSchema,
			limit: limitSchema,
			filters: debtsFiltersSchema.optional(),
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;

		const debtSummaries = database
			.with("debtSummaries", () =>
				database
					.selectFrom("debts")
					.where("debts.ownerAccountId", "=", ctx.auth.accountId)
					.innerJoin("users", (qb) => qb.onRef("users.id", "=", "debts.userId"))
					.select([
						"debts.userId",
						"users.name",
						"debts.currencyCode",
						database.fn.sum<string>("debts.amount").as("sum"),
					])
					.groupBy(["debts.userId", "users.name", "debts.currencyCode"]),
			)
			.selectFrom("debtSummaries");

		const users = debtSummaries.$if(!input.filters?.showResolved, (qb) =>
			qb.where(
				"userId",
				"not in",
				debtSummaries
					.select("userId")
					.groupBy("userId")
					.having(
						(eb) => eb.fn.count(eb.case().when("sum", "<>", "0").then(1).end()),
						"=",
						0,
					),
			),
		);

		const [paginatedUsers, totalCount] = await Promise.all([
			users
				.select("userId")
				.groupBy(["name", "userId"])
				.orderBy(["name", "userId"])
				.offset(input.cursor)
				.limit(input.limit)
				.execute(),
			database
				.selectFrom(users.select("userId").groupBy("userId").as("groupedUsers"))
				.select((eb) => eb.fn.count<string>("userId").as("count"))
				.executeTakeFirstOrThrow(),
		]);

		return {
			count: parseInt(totalCount.count, 10),
			cursor: input.cursor,
			items: paginatedUsers.map(({ userId }) => userId),
		};
	});
