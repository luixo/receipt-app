import { z } from "zod";

import { MONTH } from "~utils/time";
import {
	getForeignReceipts,
	getOwnReceipts,
} from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { currencyCodeSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			options: z.discriminatedUnion("type", [
				z.strictObject({
					type: z.literal("receipts"),
				}),
				z.strictObject({
					type: z.literal("debts"),
				}),
			]),
		}),
	)
	.output(
		z
			.strictObject({
				currencyCode: currencyCodeSchema,
				count: z.number(),
			})
			.array(),
	)
	.query(async ({ input, ctx }) => {
		switch (input.options.type) {
			case "debts": {
				const topCurrenciesResult = await ctx.database
					.selectFrom("debts")
					.select([
						"currencyCode",
						ctx.database.fn.count<string>("id").as("count"),
					])
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
				return topCurrenciesResult.map(({ currencyCode, count }) => ({
					currencyCode,
					count: Number(count),
				}));
			}
			case "receipts": {
				const foreignReceipts = getForeignReceipts(
					ctx.database,
					ctx.auth.accountId,
				);
				const ownReceipts = getOwnReceipts(ctx.database, ctx.auth.accountId);
				const topCurrenciesResult = await ctx.database
					.with("mergedReceipts", () =>
						foreignReceipts
							.select([
								"receipts.currencyCode",
								ctx.database.fn.count<string>("receipts.id").as("count"),
							])
							.where("issued", ">", new Date(Date.now() - MONTH))
							.groupBy("receipts.currencyCode")
							.unionAll(
								ownReceipts
									.select([
										"receipts.currencyCode",
										ctx.database.fn.count<string>("receipts.id").as("count"),
									])
									.where("issued", ">", new Date(Date.now() - MONTH))
									.groupBy("receipts.currencyCode"),
							),
					)
					.selectFrom("mergedReceipts")
					.select([
						"currencyCode",
						(eb) => eb.fn.sum<string>("count").as("count"),
					])
					.groupBy("currencyCode")
					.orderBy("count desc")
					.execute();
				return topCurrenciesResult.map(({ currencyCode, count }) => ({
					currencyCode,
					count: Number(count),
				}));
			}
		}
	});
