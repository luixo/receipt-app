import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	debtsByUserFiltersSchema,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import type { DebtsId } from "~db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	userId: userIdSchema,
	cursor: offsetSchema,
	limit: limitSchema,
	filters: debtsByUserFiltersSchema.optional().default({}),
});

type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<DebtsId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
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
	if (user.ownerAccountId !== auth.accountId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `User "${input.userId}" is not owned by "${auth.email}".`,
		});
	}
	const currencySums = database
		.selectFrom("debts")
		.where((eb) =>
			eb.and({
				"debts.userId": input.userId,
				"debts.ownerAccountId": auth.accountId,
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
				"debts.ownerAccountId": auth.accountId,
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
};

const queueDebtList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, DebtsId, Output>(inputs, (value) => fetchPage(ctx, value)),
);

export const procedure = authProcedure.input(inputSchema).query(queueDebtList);
