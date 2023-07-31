import { ReceiptsSelectExpression, Database } from "next-app/db";
import { DEBTS } from "next-app/db/consts";
import { AccountsId, DebtsId, Receipts } from "next-app/db/models";
import { getValidParticipants } from "next-app/handlers/receipt-items/utils";

export const getDebt = <SE extends ReceiptsSelectExpression<"debts">>(
	database: Database,
	id: DebtsId,
	ownerAccountId: AccountsId,
	selectExpression: SE[],
) =>
	database
		.selectFrom("debts")
		.where("debts.id", "=", id)
		.where("debts.ownerAccountId", "=", ownerAccountId)
		.leftJoin("debts as theirDebts", (qb) =>
			qb
				.onRef("theirDebts.id", "=", "debts.id")
				.onRef("theirDebts.ownerAccountId", "<>", "debts.ownerAccountId"),
		)
		.select([
			...selectExpression,
			"theirDebts.ownerAccountId as theirOwnerAccountId",
			"theirDebts.lockedTimestamp as theirLockedTimestamp",
		])
		.executeTakeFirst();

const getReceiptDebtName = (receipt: Pick<Receipts, "name">) =>
	`Receipt "${receipt.name}"`;

type Participant = Awaited<ReturnType<typeof getValidParticipants>>[number];

export const upsertDebtFromReceipt = async (
	database: Database,
	participants: Participant[],
	receipt: Pick<
		Receipts,
		| "id"
		| "ownerAccountId"
		| "lockedTimestamp"
		| "name"
		| "issued"
		| "currencyCode"
	>,
	created: Date,
) =>
	database
		.insertInto("debts")
		.values(
			participants.map((participant) => ({
				id: participant.debtId,
				ownerAccountId: receipt.ownerAccountId,
				userId: participant.remoteUserId,
				note: getReceiptDebtName(receipt),
				currencyCode: receipt.currencyCode,
				created,
				timestamp: receipt.issued,
				amount: participant.sum.toString(),
				receiptId: receipt.id,
				lockedTimestamp: receipt.lockedTimestamp,
			})),
		)
		.onConflict((oc) =>
			oc
				.constraint(DEBTS.CONSTRAINTS.OWNER_ID_RECEIPT_ID_USER_ID_TUPLE)
				.doUpdateSet({
					currencyCode: (eb) => eb.ref("excluded.currencyCode"),
					timestamp: (eb) => eb.ref("excluded.timestamp"),
					amount: (eb) => eb.ref("excluded.amount"),
					lockedTimestamp: (eb) => eb.ref("excluded.lockedTimestamp"),
				}),
		)
		.returning(["id as debtId", "userId", "note"])
		.execute();

export const getDebtsResult = (
	participants: Participant[],
	actualDebts: Awaited<ReturnType<typeof upsertDebtFromReceipt>>,
	receipt: Pick<
		Receipts,
		| "id"
		| "ownerAccountId"
		| "lockedTimestamp"
		| "name"
		| "issued"
		| "currencyCode"
	>,
	created: Date,
) =>
	participants.map((participant) => {
		const actualDebt = actualDebts.find(
			(debt) => debt.userId === participant.remoteUserId,
		)!;
		return {
			debtId: actualDebt.debtId,
			userId: participant.remoteUserId,
			updated: actualDebt.debtId !== participant.debtId,
			note: actualDebt.note,
			currencyCode: receipt.currencyCode,
			created,
			timestamp: receipt.issued,
			amount: Number(participant.sum),
		};
	});
