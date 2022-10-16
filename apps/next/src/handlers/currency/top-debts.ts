import { Currency } from "app/utils/currency";
import { MONTH } from "app/utils/time";
import { getDatabase } from "next-app/db";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const database = getDatabase(ctx);
	const topCurrenciesResult = await database
		.selectFrom("debts")
		.select(["currency", database.fn.count<string>("id").as("count")])
		.where("timestamp", ">", new Date(Date.now() - MONTH))
		.where("debts.ownerAccountId", "=", ctx.auth.accountId)
		.groupBy("currency")
		.orderBy("count", "desc")
		.execute();
	return topCurrenciesResult.map(({ currency }) => currency as Currency);
});
