import { z } from "zod";

import { getNow, substract } from "~utils/date";
import {
	getOwnReceipts,
	getParticipantsReceipts,
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
				count: z.int(),
			})
			.array(),
	)
	.query(async ({ input, ctx }) => {
		const minimalTimestamp = substract.plainDate(getNow.plainDate(), {
			months: 1,
		});
		switch (input.options.type) {
			case "debts": {
				const topCurrenciesResult = await ctx.database
					.selectFrom("debts")
					.select([
						"currencyCode",
						ctx.database.fn.count<string>("id").as("count"),
					])
					.where((eb) =>
						eb("timestamp", ">", minimalTimestamp).and(
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
				const topCurrenciesResult = await ctx.database
					.with("mergedReceipts", () => {
						const participantReceipts = getParticipantsReceipts(
							ctx.database,
							ctx.auth.accountId,
						)
							.select([
								"receipts.currencyCode",
								ctx.database.fn.count<string>("receipts.id").as("count"),
							])
							.where("issued", ">", minimalTimestamp)
							.groupBy("receipts.currencyCode");
						const ownerReceipts = getOwnReceipts(
							ctx.database,
							ctx.auth.accountId,
						)
							.select([
								"receipts.currencyCode",
								ctx.database.fn.count<string>("receipts.id").as("count"),
							])
							.where("issued", ">", minimalTimestamp)
							.groupBy("receipts.currencyCode");
						return participantReceipts.unionAll(ownerReceipts);
					})
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
