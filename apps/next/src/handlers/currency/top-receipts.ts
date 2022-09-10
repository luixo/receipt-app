import { sql } from "kysely";

import { Currency } from "app/utils/currency";
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
					"receipts.currency",
					database.fn.count<string>("receipts.id").as("count"),
				])
				.where("issued", ">", new Date(Date.now() - MONTH))
				.groupBy("receipts.currency")
				.union(
					ownReceipts
						.select([
							"receipts.currency",
							database.fn.count<string>("receipts.id").as("count"),
						])
						.where("issued", ">", new Date(Date.now() - MONTH))
						.groupBy("receipts.currency")
				)
		)
		.selectFrom("mergedReceipts")
		.select([
			"currency",
			// TODO: return `database.fn.sum<string>("count").as("count")`
			sql`sum(count)`.as("count"),
		])
		.groupBy("currency")
		.orderBy("count", "desc")
		.execute();
	return topCurrenciesResult.map(({ currency }) => currency as Currency);
});
