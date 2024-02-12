import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import type { UsersId } from "next-app/db/models";
import { getForeignReceipts } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { limitSchema, offsetSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			cursor: offsetSchema,
			limit: limitSchema,
			orderBy: z.union([z.literal("date-asc"), z.literal("date-desc")]),
			filters: z
				.strictObject({
					resolvedByMe: z.boolean().optional(),
					ownedByMe: z.boolean().optional(),
					locked: z.boolean().optional(),
				})
				.optional(),
		}),
	)
	.query(async ({ input: { filters = {}, ...input }, ctx }) => {
		const { database } = ctx;
		const foreignReceipts = getForeignReceipts(database, ctx.auth.accountId);
		const ownReceipts = database
			.selectFrom("receipts")
			.where("receipts.ownerAccountId", "=", ctx.auth.accountId);

		const mergedReceipts = database
			.with("mergedReceipts", () => {
				const foreignReceiptsBuilder = foreignReceipts
					.select([
						"receipts.id",
						"receipts.issued",
						sql
							.id("receiptParticipants", "resolved")
							.$castTo<boolean | null>()
							.as("resolved"),
						"receipts.lockedTimestamp",
					])
					.groupBy([
						"receipts.id",
						"receipts.lockedTimestamp",
						"receiptParticipants.resolved",
					]);
				const ownReceiptsBuilder = ownReceipts
					.leftJoin("receiptParticipants", (jb) =>
						jb.onRef("receiptParticipants.receiptId", "=", "receipts.id").onRef(
							"receiptParticipants.userId",
							"=",
							// We use `userId` = `ownerAccountId` contract
							// But type system doesn't know about that
							sql.id("receipts", "ownerAccountId").$castTo<UsersId>(),
						),
					)
					.select([
						"receipts.id",
						"receipts.issued",
						"receiptParticipants.resolved",
						"receipts.lockedTimestamp",
					])
					.groupBy([
						"receipts.id",
						"receipts.lockedTimestamp",
						"receiptParticipants.resolved",
					]);
				if (typeof filters.ownedByMe !== "boolean") {
					return foreignReceiptsBuilder.union(ownReceiptsBuilder);
				}
				if (filters.ownedByMe) {
					return ownReceiptsBuilder;
				}
				return foreignReceiptsBuilder;
			})
			.selectFrom("mergedReceipts")
			.$if(typeof filters.resolvedByMe === "boolean", (qb) =>
				qb.where("mergedReceipts.resolved", "=", Boolean(filters.resolvedByMe)),
			)
			.$if(typeof filters.locked === "boolean", (qb) =>
				qb.where(
					"mergedReceipts.lockedTimestamp",
					filters.locked ? "is not" : "is",
					null,
				),
			);

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
				.limit(input.limit + 1)
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
			hasMore: receiptIds.length === input.limit + 1,
			cursor: input.cursor,
			items: receiptIds.slice(0, input.limit).map(({ id }) => id),
		};
	});
