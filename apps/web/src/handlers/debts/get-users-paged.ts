import { z } from "zod";

import {
	debtsFiltersSchema,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import type { UsersId } from "~db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	cursor: offsetSchema,
	limit: limitSchema,
	filters: debtsFiltersSchema.optional(),
});
type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<UsersId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	const debtSummaries = database
		.with("debtSummaries", () =>
			database
				.selectFrom("debts")
				.where("debts.ownerAccountId", "=", auth.accountId)
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
};

const queueUserList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, UsersId, Output>(inputs, (values) =>
			fetchPage(ctx, values),
		),
);

export const procedure = authProcedure.input(inputSchema).query(queueUserList);
