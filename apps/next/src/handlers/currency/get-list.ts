import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { MONTH } from "app/utils/time";
import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import {
	getForeignReceipts,
	getOwnReceipts,
} from "next-app/handlers/receipts/utils";
import { localeSchema } from "next-app/handlers/validation";
import { getCurrencies } from "next-app/utils/currency";

export const router = trpc.router<AuthorizedContext>().query("getList", {
	input: z.strictObject({
		locale: localeSchema,
	}),
	resolve: async ({ input, ctx }) => {
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
		const topCurrenciesOrder = topCurrenciesResult.map(
			({ currency }) => currency
		);
		return {
			topAmount: topCurrenciesOrder.length,
			list: Object.entries(getCurrencies(input.locale))
				.map(([code, currency]) => ({
					code,
					name: currency.name_plural,
					symbol: currency.symbol_native,
				}))
				.sort(
					(a, b) =>
						topCurrenciesOrder.indexOf(b.code) -
						topCurrenciesOrder.indexOf(a.code)
				),
		};
	},
});
