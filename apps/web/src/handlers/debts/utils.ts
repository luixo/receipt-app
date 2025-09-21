import type { Insertable } from "kysely";
import { isNonNullish, omit } from "remeda";

import type { Database } from "~db/database";
import type { DebtsId, UsersId } from "~db/models";
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
					!debt.isNew
						? eb.and({
								id: debt.id,
								ownerAccountId: debt.ownerAccountId,
							})
						: debt.receiptId
							? eb.and({
									ownerAccountId: debt.ownerAccountId,
									userId: debt.userId,
									receiptId: debt.receiptId,
								})
							: eb("debts.ownerAccountId", "is", null),
				),
			),
		)
		.select([
			"debts.id",
			"debts.ownerAccountId",
			"debts.userId",
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
					fetchedDebt.ownerAccountId === debt.ownerAccountId &&
					fetchedDebt.userId === debt.userId &&
					fetchedDebt.receiptId === debt.receiptId
				);
			}
			return (
				fetchedDebt.ownerAccountId === debt.ownerAccountId &&
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
			? ([] as { id: DebtsId; userId: UsersId }[])
			: database
					.insertInto("debts")
					.values(nonExistentDebts.map((debt) => omit(debt, ["isNew"])))
					.returning(["debts.id", "debts.userId"])
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
						ownerAccountId: currentDebt.ownerAccountId,
						userId: currentDebt.userId,
					}),
				)
				.returning(["debts.id", "debts.receiptId", "debts.userId"])
				.executeTakeFirstOrThrow(),
		),
	]);
	return { newDebts, updatedDebts };
};
