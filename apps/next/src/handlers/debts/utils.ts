import { Selection } from "kysely";

import { formatDate } from "app/utils/date";
import {
	ReceiptsSelectExpression,
	ReceiptsDatabase,
	Database,
} from "next-app/db";
import { DEBTS } from "next-app/db/consts";
import { AccountsId, DebtsId, Receipts, UsersId } from "next-app/db/models";
import { getValidParticipants } from "next-app/handlers/receipt-items/utils";

export const getDebt = <SE extends ReceiptsSelectExpression<"debts">>(
	database: Database,
	id: DebtsId,
	ownerAccountId: AccountsId,
	selectExpression: SE[]
): Promise<Selection<ReceiptsDatabase, "debts", SE> | undefined> =>
	database
		.selectFrom("debts")
		.where("id", "=", id)
		.where("ownerAccountId", "=", ownerAccountId)
		.select(selectExpression)
		.executeTakeFirst();

type Participant = Awaited<ReturnType<typeof getValidParticipants>>[number];

export const upsertDebtFromReceipt = async (
	database: Database,
	participants: Participant[],
	receipt: Pick<
		Receipts,
		"id" | "ownerAccountId" | "lockedTimestamp" | "name" | "issued" | "currency"
	>,
	created: Date
) =>
	database
		.insertInto("debts")
		.values(
			participants.map((participant) => ({
				id: participant.debtId,
				ownerAccountId: receipt.ownerAccountId,
				userId: participant.remoteUserId,
				note: `Receipt "${receipt.name}" from ${formatDate(receipt.issued)}`,
				currency: receipt.currency,
				created,
				timestamp: receipt.issued,
				amount: participant.sum.toString(),
				receiptId: receipt.id,
				lockedTimestamp: receipt.lockedTimestamp,
			}))
		)
		.onConflict((oc) =>
			oc
				.constraint(DEBTS.CONSTRAINTS.OWNER_ID_RECEIPT_ID_USER_ID_TUPLE)
				.doUpdateSet({
					currency: (eb) => eb.ref("excluded.currency"),
					timestamp: (eb) => eb.ref("excluded.timestamp"),
					amount: (eb) => eb.ref("excluded.amount"),
					lockedTimestamp: (eb) => eb.ref("excluded.lockedTimestamp"),
				})
		)
		.returning(["id as debtId", "userId"])
		.execute();

export const getDebtsResult = (
	participants: Participant[],
	actualDebts: { debtId: DebtsId; userId: UsersId }[],
	receipt: Pick<
		Receipts,
		"id" | "ownerAccountId" | "lockedTimestamp" | "name" | "issued" | "currency"
	>,
	created: Date
) =>
	participants.map((participant) => {
		const actualDebtId = actualDebts.find(
			(debt) => debt.userId === participant.remoteUserId
		)!.debtId;
		return {
			debtId: actualDebtId,
			userId: participant.remoteUserId,
			updated: actualDebtId !== participant.debtId,
			note: `Receipt "${receipt.name}" from ${formatDate(receipt.issued)}`,
			currency: receipt.currency,
			created,
			timestamp: receipt.issued,
			amount: participant.sum,
		};
	});
