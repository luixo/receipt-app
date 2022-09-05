import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";
import { getLockedStatus } from "next-app/handlers/debts-sync-intentions/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { receiptIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("getReceipt", {
	input: z.strictObject({
		receiptId: receiptIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
			"lockedTimestamp",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `No receipt ${input.receiptId} found`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Account id ${ctx.auth.accountId} has no access to receipt ${input.receiptId}`,
			});
		}

		const participants = await database
			.with("participants", (qc) =>
				qc
					.selectFrom("receiptParticipants")
					.where("receiptParticipants.receiptId", "=", input.receiptId)
					// Typesystem doesn't know that we use account id as self user id
					.where(
						"receiptParticipants.userId",
						"<>",
						ctx.auth.accountId as UsersId
					)
					.innerJoin("users", (qb) =>
						qb.onRef("receiptParticipants.userId", "=", "users.id")
					)
					.leftJoin("debts", (qb) =>
						qb
							.onRef("debts.userId", "=", "receiptParticipants.userId")
							.onRef("debts.receiptId", "=", "receiptParticipants.receiptId")
							.on("debts.ownerAccountId", "=", ctx.auth.accountId)
					)
					.leftJoin("receiptItems", (qb) =>
						qb.onRef(
							"receiptItems.receiptId",
							"=",
							"receiptParticipants.receiptId"
						)
					)
					.leftJoin("itemParticipants", (qb) =>
						qb
							.onRef("receiptItems.id", "=", "itemParticipants.itemId")
							.onRef(
								"receiptParticipants.userId",
								"=",
								"itemParticipants.userId"
							)
					)
					.select([
						"receiptParticipants.userId",
						"debts.id as debtId",
						"users.connectedAccountId",
						"debts.lockedTimestamp as debtLockedTimestamp",
						database.fn.sum<string>("itemParticipants.part").as("parts"),
					])
					.groupBy("users.connectedAccountId")
					.groupBy("debts.id")
					.groupBy("debts.lockedTimestamp")
					.groupBy("receiptParticipants.userId")
					.groupBy("itemParticipants.userId")
			)
			.with("rankedParticipants", (qc) =>
				qc
					.selectFrom("participants")
					.select([
						"userId",
						"debtId",
						"connectedAccountId",
						"debtLockedTimestamp",
						"parts",
						sql`rank() over (partition by "userId" order by "parts" asc)`
							.castTo<string>()
							.as("rank"),
					])
			)
			.selectFrom("rankedParticipants")
			.selectAll()
			.where("rank", "=", "1")
			.execute();

		const statuses = await Promise.all(
			participants.map((participant) => {
				if (!participant.connectedAccountId) {
					return ["no-account" as const] as const;
				}
				if (!participant.parts) {
					return ["no-parts" as const] as const;
				}
				if (participant.debtId) {
					return getLockedStatus(
						database,
						participant.debtId,
						ctx.auth.accountId
					);
				}
				return ["nosync" as const] as const;
			})
		);

		return participants.map((participant, index) => {
			const [status, intentionDirection] = statuses[index]!;
			return {
				debtId: participant.debtId,
				synced:
					participant.debtLockedTimestamp && receipt.lockedTimestamp
						? participant.debtLockedTimestamp.valueOf() ===
						  receipt.lockedTimestamp.valueOf()
						: false,
				userId: participant.userId,
				status,
				intentionDirection,
			};
		});
	},
});
