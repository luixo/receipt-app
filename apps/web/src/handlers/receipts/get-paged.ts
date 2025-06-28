import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
	limitSchema,
	offsetSchema,
	receiptsFiltersSchema,
	receiptsOrderBySchema,
} from "~app/utils/validation";
import {
	getOwnReceipts,
	getParticipantsReceipts,
} from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.input(
		z.strictObject({
			cursor: offsetSchema,
			limit: limitSchema,
			orderBy: receiptsOrderBySchema,
			filters: receiptsFiltersSchema.optional(),
		}),
	)
	.query(async ({ input: { filters = {}, ...input }, ctx }) => {
		const { database } = ctx;
		const foreignReceipts = getParticipantsReceipts(
			database,
			ctx.auth.accountId,
		);
		const ownReceipts = getOwnReceipts(database, ctx.auth.accountId);

		const mergedReceipts = database
			.with("mergedReceipts", () => {
				const foreignReceiptsBuilder = foreignReceipts
					.groupBy(["receipts.id"])
					.select(["receipts.id", "receipts.issued"]);
				const ownReceiptsBuilder = ownReceipts
					.groupBy(["receipts.id"])
					.select(["receipts.id", "receipts.issued"]);
				if (typeof filters.ownedByMe !== "boolean") {
					return foreignReceiptsBuilder.union(ownReceiptsBuilder);
				}
				if (filters.ownedByMe) {
					return ownReceiptsBuilder;
				}
				return foreignReceiptsBuilder;
			})
			.selectFrom("mergedReceipts");

		const [receiptIds, receiptsCount] = await Promise.all([
			mergedReceipts
				.select("id")
				// Stable order for receipts with the same date
				.orderBy([
					input.orderBy === "date-asc"
						? "mergedReceipts.issued asc"
						: "mergedReceipts.issued desc",
					"mergedReceipts.id",
				])
				.offset(input.cursor)
				.limit(input.limit)
				.execute(),
			mergedReceipts
				.select((eb) => eb.fn.count<string>("mergedReceipts.id").as("amount"))
				.executeTakeFirstOrThrow(
					/* c8 ignore start */
					() =>
						new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: `Unexpected having empty "amount" in "receipts.getPaged" handler`,
						}),
					/* c8 ignore stop */
				),
		]);

		return {
			count: parseInt(receiptsCount.amount, 10),
			cursor: input.cursor,
			items: receiptIds.map(({ id }) => id),
		};
	});
