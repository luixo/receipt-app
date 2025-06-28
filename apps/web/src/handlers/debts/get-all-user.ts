import { TRPCError } from "@trpc/server";
import { unique } from "remeda";
import z from "zod/v4";

import type { CurrencyCode } from "~app/utils/currency";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

const getAllUserSchema = z.strictObject({
	userId: userIdSchema,
});
type Input = z.infer<typeof getAllUserSchema>;

const getData = async (ctx: AuthorizedContext, inputs: readonly Input[]) => {
	const userIds = unique(inputs.map(({ userId }) => userId));
	const [users, aggregatedDebts] = await Promise.all([
		ctx.database
			.selectFrom("users")
			.where("users.id", "in", userIds)
			.select(["users.id", "users.ownerAccountId"])
			.execute(),
		ctx.database
			.selectFrom("debts")
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.where("debts.userId", "in", userIds)
			.select([
				"debts.userId",
				"debts.currencyCode",
				(eb) => eb.fn.sum<string>("debts.amount").as("sum"),
			])
			.orderBy("debts.currencyCode")
			.groupBy(["debts.currencyCode", "debts.userId"])
			.execute(),
	]);
	return { users, aggregatedDebts };
};

const queueGetAllUser = queueCallFactory<
	AuthorizedContext,
	Input,
	{ currencyCode: CurrencyCode; sum: number }[]
>((ctx) => async (inputs) => {
	const { users, aggregatedDebts } = await getData(ctx, inputs);
	return inputs.map((debt) => {
		const matchedUser = users.find((result) => result.id === debt.userId);
		if (!matchedUser) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `User "${debt.userId}" does not exist.`,
			});
		}
		if (matchedUser.ownerAccountId !== ctx.auth.accountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `User "${matchedUser.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		const filteredDebts = aggregatedDebts.filter(
			(aggregatedDebt) => aggregatedDebt.userId === debt.userId,
		);
		return filteredDebts.map(({ currencyCode, sum }) => ({
			currencyCode,
			sum: parseFloat(sum),
		}));
	});
});

export const procedure = authProcedure
	.input(getAllUserSchema)
	.query(queueGetAllUser);
