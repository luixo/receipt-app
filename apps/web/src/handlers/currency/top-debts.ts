import { MONTH } from "~utils";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const topCurrenciesResult = await database
		.selectFrom("debts")
		.select(["currencyCode", database.fn.count<string>("id").as("count")])
		.where((eb) =>
			eb("timestamp", ">", new Date(Date.now() - MONTH)).and(
				"debts.ownerAccountId",
				"=",
				ctx.auth.accountId,
			),
		)
		.groupBy("currencyCode")
		.orderBy("count desc")
		.execute();
	return topCurrenciesResult;
});
