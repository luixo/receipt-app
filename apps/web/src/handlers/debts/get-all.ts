import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Get all debts",
		description:
			"Returns the current account's total debt amounts, summed per currency across all users.",
	})
	.query(async ({ ctx }) => {
		const { database } = ctx;

		const debts = await database
			.selectFrom("debts")
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.select([
				"debts.currencyCode",
				database.fn.sum<string>("debts.amount").as("sum"),
			])
			.orderBy("debts.currencyCode")
			.groupBy(["debts.currencyCode"])
			.execute();

		return debts.map(({ currencyCode, sum }) => ({
			currencyCode,
			sum: Number(sum),
		}));
	});
