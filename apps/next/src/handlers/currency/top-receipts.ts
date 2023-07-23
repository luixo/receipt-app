import { sql } from "kysely";

import { MONTH } from "app/utils/time";
import { getDatabase } from "next-app/db";
import {
	getForeignReceipts,
	getOwnReceipts,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const database = getDatabase(ctx);
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
				.union(
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
		.select([
			"currencyCode",
			// TODO: return `database.fn.sum<string>("count").as("count")`
			sql`sum(count)`.as("count"),
		])
		.groupBy("currencyCode")
		.orderBy("count", "desc")
		.execute();
	return topCurrenciesResult;
});
