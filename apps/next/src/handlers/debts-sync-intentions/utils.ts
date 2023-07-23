import * as trpc from "@trpc/server";
import { z } from "zod";

import { Database } from "next-app/db";
import { AccountsId, DebtsId } from "next-app/db/models";
import { getValidParticipants } from "next-app/handlers/receipt-items/utils";

export const getDebtIntention = async (
	database: Database,
	debtId: DebtsId,
	accountId: AccountsId,
) =>
	database
		.selectFrom("debts")
		.where("debts.id", "=", debtId)
		.leftJoin("debts as debtsMine", (qb) =>
			qb
				.onRef("debts.id", "=", "debtsMine.id")
				.on("debtsMine.ownerAccountId", "=", accountId),
		)
		.leftJoin("debtsSyncIntentions", (qb) =>
			qb.onRef("debts.id", "=", "debtsSyncIntentions.debtId"),
		)
		.leftJoin("debts as debtsTheir", (qb) =>
			qb
				.onRef("debts.id", "=", "debtsTheir.id")
				.on("debtsTheir.ownerAccountId", "<>", accountId),
		)
		.select([
			"debtsSyncIntentions.ownerAccountId as intentionAccountId",
			"debtsMine.lockedTimestamp as mineLockedTimestamp",
			"debtsMine.ownerAccountId as mineOwnerAccountId",
			"debtsTheir.lockedTimestamp as theirLockedTimestamp",
			"debtsTheir.ownerAccountId as theirOwnerAccountId",
		])
		.executeTakeFirst();

const syncStatusSchema = z.discriminatedUnion("type", [
	// The foreign user doesn't have a debt
	z.strictObject({ type: z.literal("nosync") }),
	// The foreign user debt's data is different
	z.strictObject({
		type: z.literal("unsync"),
		intention: z
			.strictObject({
				direction: z.union([z.literal("self"), z.literal("remote")]),
			})
			.optional(),
	}),
	// The foreign user debt's data is in sync
	z.strictObject({ type: z.literal("sync") }),
]);

export type SyncStatus = z.infer<typeof syncStatusSchema>;

export const getSyncStatus = async (
	database: Database,
	debtId: DebtsId,
	accountId: AccountsId,
): Promise<SyncStatus> => {
	const debtIntention = await getDebtIntention(database, debtId, accountId);
	if (!debtIntention) {
		throw new trpc.TRPCError({
			code: "NOT_FOUND",
			message: `Debt ${debtId} does not exist.`,
		});
	}
	const {
		mineOwnerAccountId,
		mineLockedTimestamp,
		theirOwnerAccountId,
		theirLockedTimestamp,
		intentionAccountId,
	} = debtIntention;
	if (!mineOwnerAccountId) {
		throw new trpc.TRPCError({
			code: "FORBIDDEN",
			message: `Debt ${debtId} does not exist for user ${accountId}.`,
		});
	}
	if (
		theirLockedTimestamp &&
		mineLockedTimestamp &&
		theirLockedTimestamp.valueOf() === mineLockedTimestamp.valueOf()
	) {
		return { type: "sync" };
	}
	if (!intentionAccountId) {
		if (theirOwnerAccountId) {
			return { type: "unsync" };
		}
		return { type: "nosync" };
	}
	if (intentionAccountId === accountId) {
		return {
			type: "unsync",
			intention: { direction: "self" },
		};
	}
	return {
		type: "unsync",
		intention: { direction: "remote" },
	};
};

type Participant = Awaited<ReturnType<typeof getValidParticipants>>[number];

export const upsertDebtIntentionFromReceipt = async (
	database: Database,
	participants: Participant[],
	ownerAccountId: AccountsId,
	created: Date,
) =>
	database
		.insertInto("debtsSyncIntentions")
		.values(
			participants.map((participant) => ({
				debtId: participant.debtId,
				ownerAccountId,
				lockedTimestamp: created,
			})),
		)
		.onConflict((oc) =>
			oc.column("debtId").doUpdateSet({
				ownerAccountId: (eb) => eb.ref("excluded.ownerAccountId"),
				lockedTimestamp: (eb) => eb.ref("excluded.lockedTimestamp"),
			}),
		)
		.execute();
