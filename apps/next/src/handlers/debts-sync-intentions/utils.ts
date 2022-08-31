import * as trpc from "@trpc/server";
import { z } from "zod";

import { Database } from "next-app/db";
import { AccountsId, DebtsId } from "next-app/db/models";
import { getValidParticipants } from "next-app/handlers/receipt-items/utils";

export const getDebtIntention = async (
	database: Database,
	debtId: DebtsId,
	accountId: AccountsId
) =>
	database
		.selectFrom("debts")
		.where("debts.id", "=", debtId)
		.leftJoin("debts as debtsMine", (qb) =>
			qb
				.onRef("debts.id", "=", "debtsMine.id")
				.on("debtsMine.ownerAccountId", "=", accountId)
		)
		.leftJoin("debtsSyncIntentions", (qb) =>
			qb.onRef("debts.id", "=", "debtsSyncIntentions.debtId")
		)
		.leftJoin("debts as debtsTheir", (qb) =>
			qb
				.onRef("debts.id", "=", "debtsTheir.id")
				.on("debtsTheir.ownerAccountId", "<>", accountId)
		)
		.select([
			"debtsSyncIntentions.ownerAccountId as intentionAccountId",
			"debtsMine.lockedTimestamp as mineLockedTimestamp",
			"debtsMine.ownerAccountId as mineOwnerAccountId",
			"debtsTheir.lockedTimestamp as theirLockedTimestamp",
			"debtsTheir.ownerAccountId as theirOwnerAccountId",
		])
		.executeTakeFirst();

const syncStatusSchema = z.union([
	// The foreign user doesn't have a debt
	z.literal("nosync"),
	// The foreign user debt's data is different
	z.literal("unsync"),
	// The foreign user debt's data is in sync
	z.literal("sync"),
]);
const intentionDirectionSchema = z
	.union([z.literal("self"), z.literal("remote")])
	.optional();
export const statusSchema = z.tuple([
	syncStatusSchema,
	intentionDirectionSchema,
]);

export const getLockedStatus = async (
	database: Database,
	debtId: DebtsId,
	accountId: AccountsId
): Promise<z.infer<typeof statusSchema>> => {
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
		return ["sync", undefined];
	}
	if (!intentionAccountId) {
		if (theirOwnerAccountId) {
			return ["unsync", undefined];
		}
		return ["nosync", undefined];
	}
	if (intentionAccountId === accountId) {
		return ["unsync", "self"];
	}
	return ["unsync", "remote"];
};

type Participant = Awaited<ReturnType<typeof getValidParticipants>>[number];

export const upsertDebtIntentionFromReceipt = async (
	database: Database,
	participants: Participant[],
	ownerAccountId: AccountsId,
	created: Date
) =>
	database
		.insertInto("debtsSyncIntentions")
		.values(
			participants.map((participant) => ({
				debtId: participant.debtId,
				ownerAccountId,
				lockedTimestamp: created,
			}))
		)
		.onConflict((oc) =>
			oc.column("debtId").doUpdateSet({
				ownerAccountId: (eb) => eb.ref("excluded.ownerAccountId"),
				lockedTimestamp: (eb) => eb.ref("excluded.lockedTimestamp"),
			})
		)
		.execute();
