import type { Database, DebtsId, SimpleInsertObject } from "~db";
import { nonNullishGuard } from "~utils";

export const upsertAutoAcceptedDebts = async (
	database: Database,
	debts: (SimpleInsertObject<"debts"> & { isNew: boolean })[],
) => {
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
		.map((nextDebt, index) =>
			counterpartyDebts[index]
				? ([nextDebt, counterpartyDebts[index]!] as const)
				: null,
		)
		.filter(nonNullishGuard);
	const nonExistentDebts = debts
		.map((nextDebt, index) => (counterpartyDebts[index] ? null : nextDebt))
		.filter(nonNullishGuard);
	const [newDebts, ...updatedDebts] = await Promise.all([
		nonExistentDebts.length === 0
			? ([] as { id: DebtsId }[])
			: database
					.insertInto("debts")
					.values(nonExistentDebts.map(({ isNew, ...debt }) => debt))
					.returning(["debts.id"])
					.execute(),
		...existentDebts.map(([nextDebt, currentDebt]) =>
			database
				.updateTable("debts")
				.set({
					amount: nextDebt.amount,
					timestamp: nextDebt.timestamp,
					currencyCode: nextDebt.currencyCode,
					receiptId: nextDebt.receiptId,
					lockedTimestamp: nextDebt.lockedTimestamp,
				})
				.where((eb) =>
					eb.and({
						id: currentDebt.id,
						ownerAccountId: currentDebt.ownerAccountId,
						userId: currentDebt.userId,
					}),
				)
				.returning(["debts.id", "debts.receiptId"])
				.executeTakeFirst(),
		),
	]);
	return { newDebts, updatedDebts };
};
