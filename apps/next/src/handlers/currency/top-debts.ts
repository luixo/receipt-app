import { MONTH } from "app/utils/time";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const topCurrenciesResult = await database
		.selectFrom("debts")
		.select(["currencyCode", database.fn.count<string>("id").as("count")])
		.where("timestamp", ">", new Date(Date.now() - MONTH))
		.where("debts.ownerAccountId", "=", ctx.auth.accountId)
		.groupBy("currencyCode")
		.orderBy("count", "desc")
		.execute();
	return topCurrenciesResult;
});
