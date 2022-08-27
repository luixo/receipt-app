import * as trpc from "@trpc/server";
import { z } from "zod";

import { Database, getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getDebtIntention } from "next-app/handlers/debts-sync-intentions/utils";
import { debtIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("accept", {
	input: z.strictObject({
		id: debtIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const debtIntention = await getDebtIntention(
			database,
			input.id,
			ctx.auth.accountId
		);
		if (!debtIntention || !debtIntention.intentionAccountId) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Intention for debt ${input.id} is not found.`,
			});
		}
		const { theirLockedTimestamp } = debtIntention;
		if (!theirLockedTimestamp) {
			throw new trpc.TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Counterparty debt ${input.id} is not locked.`,
			});
		}
		const deleteIntention = (db: Database) =>
			db
				.deleteFrom("debtsSyncIntentions")
				.where("debtId", "=", input.id)
				.execute();
		if (debtIntention.mineOwnerAccountId) {
			return database.transaction().execute(async (tx) => {
				if (!debtIntention.theirOwnerAccountId) {
					throw new trpc.TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Trying to accept a debt ${input.id} that doesn't exist on counteryparty.`,
					});
				}
				const fullForeignDebt = await database
					.selectFrom("debts")
					.where("id", "=", input.id)
					.where("ownerAccountId", "=", debtIntention.theirOwnerAccountId)
					.select(["amount", "timestamp", "created"])
					.executeTakeFirstOrThrow();
				const nextAmount = Number(fullForeignDebt.amount) * -1;
				await tx
					.updateTable("debts")
					.where("id", "=", input.id)
					.where("ownerAccountId", "=", ctx.auth.accountId)
					.set({
						lockedTimestamp: theirLockedTimestamp,
						amount: nextAmount.toString(),
						timestamp: fullForeignDebt.timestamp,
					})
					.executeTakeFirst();
				await deleteIntention(tx);

				return {
					amount: nextAmount,
					timestamp: fullForeignDebt.timestamp,
					created: fullForeignDebt.created,
					note: "never used",
				};
			});
		}
		return database.transaction().execute(async (tx) => {
			const createdTimestamp = new Date();
			if (!debtIntention.theirOwnerAccountId) {
				throw new trpc.TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Trying to accept a debt ${input.id} that doesn't exist on counteryparty.`,
				});
			}
			const fullForeignDebt = await database
				.selectFrom("debts")
				.where("debts.id", "=", input.id)
				.where("debts.ownerAccountId", "=", debtIntention.theirOwnerAccountId)
				.innerJoin("users", (qb) =>
					qb
						.onRef("users.connectedAccountId", "=", "debts.ownerAccountId")
						.on("users.ownerAccountId", "=", ctx.auth.accountId)
				)
				.select([
					"amount",
					"timestamp",
					"currency",
					"lockedTimestamp",
					"note",
					"users.id as foreignUserId",
				])
				.executeTakeFirstOrThrow();
			const nextAmount = Number(fullForeignDebt.amount) * -1;
			await tx
				.insertInto("debts")
				.values({
					id: input.id,
					ownerAccountId: ctx.auth.accountId,
					userId: fullForeignDebt.foreignUserId,
					currency: fullForeignDebt.currency,
					amount: nextAmount.toString(),
					timestamp: fullForeignDebt.timestamp,
					created: createdTimestamp,
					note: fullForeignDebt.note,
					lockedTimestamp: fullForeignDebt.lockedTimestamp,
				})
				.execute();
			await deleteIntention(tx);
			return {
				amount: nextAmount,
				timestamp: fullForeignDebt.timestamp,
				created: createdTimestamp,
				note: fullForeignDebt.note,
			};
		});
	},
});
