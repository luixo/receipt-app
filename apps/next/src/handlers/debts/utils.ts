import { Selection } from "kysely";

import { ReceiptsSelectExpression, Database } from "next-app/db";
import { DEBTS } from "next-app/db/consts";
import { AccountsId, DebtsId, Receipts } from "next-app/db/models";
import { ReceiptsDatabase } from "next-app/db/types";
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

const getReceiptDebtName = (receipt: Pick<Receipts, "name">) =>
	`Receipt "${receipt.name}"`;

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
				note: getReceiptDebtName(receipt),
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
		.returning(["id as debtId", "userId", "note"])
		.execute();

export const getDebtsResult = (
	participants: Participant[],
	actualDebts: Awaited<ReturnType<typeof upsertDebtFromReceipt>>,
	receipt: Pick<
		Receipts,
		"id" | "ownerAccountId" | "lockedTimestamp" | "name" | "issued" | "currency"
	>,
	created: Date
) =>
	participants.map((participant) => {
		const actualDebt = actualDebts.find(
			(debt) => debt.userId === participant.remoteUserId
		)!;
		return {
			debtId: actualDebt.debtId,
			userId: participant.remoteUserId,
			updated: actualDebt.debtId !== participant.debtId,
			note: actualDebt.note,
			currency: receipt.currency,
			created,
			timestamp: receipt.issued,
			amount: Number(participant.sum),
		};
	});
