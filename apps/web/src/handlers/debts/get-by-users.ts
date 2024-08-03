import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~db";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const [debts, unsyncedUsers] = await Promise.all([
		database
			.selectFrom("debts")
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.innerJoin("users", (qb) => qb.onRef("users.id", "=", "debts.userId"))
			.select([
				database.fn.sum<string>("debts.amount").as("sum"),
				"debts.currencyCode",
				"debts.userId",
				"users.name",
			])
			.groupBy("debts.userId")
			.groupBy("currencyCode")
			.groupBy("users.name")
			.execute(),
		database
			.selectFrom("debts")
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.where("debts.lockedTimestamp", "is not", null)
			.innerJoin("users", (qb) =>
				qb
					.onRef("users.id", "=", "debts.userId")
					.on("users.connectedAccountId", "is not", null),
			)
			.leftJoin("debts as theirDebts", (qb) =>
				qb
					.onRef("theirDebts.id", "=", "debts.id")
					.onRef("theirDebts.ownerAccountId", "<>", "debts.ownerAccountId"),
			)
			.where((eb) =>
				eb.or([
					eb("theirDebts.ownerAccountId", "is", null),
					eb(
						"theirDebts.lockedTimestamp",
						"!=",
						eb.ref("debts.lockedTimestamp"),
					),
				]),
			)
			.select([
				"users.name",
				"users.id",
				database.fn.count<string>("debts.id").as("unsyncedDebts"),
			])
			.groupBy(["users.id", "users.name"])
			.execute(),
	]);

	const debtsByUsers = debts.reduce<
		Map<
			UsersId,
			{ items: { currencyCode: CurrencyCode; sum: number }[]; name: string }
		>
	>((acc, { sum, userId, currencyCode, name }) => {
		if (!acc.has(userId)) {
			acc.set(userId, { name, items: [] });
		}
		// We just set user object
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		acc.get(userId)!.items.push({ currencyCode, sum: Number(sum) });
		return acc;
	}, new Map());
	const debtsByUsersEntries = [...debtsByUsers.entries()];

	return debtsByUsersEntries
		.sort(([, { name: nameA }], [, { name: nameB }]) =>
			nameA.localeCompare(nameB),
		)
		.map(([userId, { items }]) => {
			const unsyncedDebts =
				unsyncedUsers.find((user) => user.id === userId)?.unsyncedDebts ?? "0";
			return {
				userId,
				unsyncedDebtsAmount: Number(unsyncedDebts),
				debts: items.sort((itemA, itemB) =>
					itemA.currencyCode.localeCompare(itemB.currencyCode),
				),
			};
		});
});
