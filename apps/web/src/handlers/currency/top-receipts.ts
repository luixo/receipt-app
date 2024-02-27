import { MONTH } from "~app/utils/time";
import {
	getForeignReceipts,
	getOwnReceipts,
} from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const foreignReceipts = getForeignReceipts(database, ctx.auth.accountId);
	const ownReceipts = getOwnReceipts(database, ctx.auth.accountId);
	const topCurrenciesResult = await database
		.with("mergedReceipts", () =>
			foreignReceipts
				.select([
					"receipts.currencyCode",
					database.fn.count<string>("receipts.id").as("count"),
				])
				.where("issued", ">", new Date(Date.now() - MONTH))
				.groupBy("receipts.currencyCode")
				.unionAll(
					ownReceipts
						.select([
							"receipts.currencyCode",
							database.fn.count<string>("receipts.id").as("count"),
						])
						.where("issued", ">", new Date(Date.now() - MONTH))
						.groupBy("receipts.currencyCode"),
				),
		)
		.selectFrom("mergedReceipts")
		.select(["currencyCode", (eb) => eb.fn.sum<string>("count").as("count")])
		.groupBy("currencyCode")
		.orderBy("count desc")
		.execute();
	return topCurrenciesResult;
});
