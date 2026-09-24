import type { Insertable } from "kysely";
import { isNonNullish, omit } from "remeda";

import type { Database } from "~db/database";
import type { DebtId, PeerId } from "~db/ids";
import type { DB } from "~db/types.gen";
import type { MakeUndefinedOptional } from "~utils/types";

export const upsertAutoAcceptedDebts = async (
	database: Database,
	debts: (MakeUndefinedOptional<Insertable<DB["debts"]>> & {
		isNew: boolean;
	})[],
) => {
	if (debts.length === 0) {
		return { newDebts: [], updatedDebts: [] };
	}
	const fetchedDebts = await database
		.selectFrom("debts")
		.where((eb) =>
			eb.or(
				debts.map((debt) =>
					debt.isNew
						? debt.receiptId
							? eb.and({
									ownerUserId: debt.ownerUserId,
									peerId: debt.peerId,
									receiptId: debt.receiptId,
								})
							: eb("debts.ownerUserId", "is", null)
						: eb.and({
								id: debt.id,
								ownerUserId: debt.ownerUserId,
							}),
				),
			),
		)
		.select([
			"debts.id",
			"debts.ownerUserId",
			"debts.peerId",
			"debts.receiptId",
		])
		.execute();
	const counterpartyDebts = debts.map((debt) =>
		fetchedDebts.find((fetchedDebt) => {
			if (debt.isNew) {
				if (!debt.receiptId || !fetchedDebt.receiptId) {
					return false;
				}
				return (
					fetchedDebt.ownerUserId === debt.ownerUserId &&
					fetchedDebt.peerId === debt.peerId &&
					fetchedDebt.receiptId === debt.receiptId
				);
			}
			return (
				fetchedDebt.ownerUserId === debt.ownerUserId &&
				fetchedDebt.id === debt.id
			);
		}),
	);
	const existentDebts = debts
		.map((nextDebt, index) => {
			const counterpartyDebt = counterpartyDebts[index];
			return counterpartyDebt ? ([nextDebt, counterpartyDebt] as const) : null;
		})
		.filter(isNonNullish);
	const nonExistentDebts = debts
		.map((nextDebt, index) => (counterpartyDebts[index] ? null : nextDebt))
		.filter(isNonNullish);
	const [newDebts, ...updatedDebts] = await Promise.all([
		nonExistentDebts.length === 0
			? ([] as { id: DebtId; peerId: PeerId }[])
			: database
					.insertInto("debts")
					.values(nonExistentDebts.map((debt) => omit(debt, ["isNew"])))
					.returning(["debts.id", "debts.peerId"])
					.execute(),
		...existentDebts.map(([nextDebt, currentDebt]) =>
			database
				.updateTable("debts")
				.set({
					amount: nextDebt.amount,
					timestamp: nextDebt.timestamp,
					currencyCode: nextDebt.currencyCode,
					receiptId: nextDebt.receiptId,
				})
				.where((eb) =>
					eb.and({
						id: currentDebt.id,
						ownerUserId: currentDebt.ownerUserId,
						peerId: currentDebt.peerId,
					}),
				)
				.returning(["debts.id", "debts.receiptId", "debts.peerId"])
				.executeTakeFirstOrThrow(),
		),
	]);
	return { newDebts, updatedDebts };
};
