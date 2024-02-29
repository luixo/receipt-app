import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~db";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const debts = await database
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
		.groupBy("users.name")
		.groupBy("currencyCode")
		.execute();

	const debtsByUsers = debts.reduce<
		Map<
			UsersId,
			{ items: { currencyCode: CurrencyCode; sum: number }[]; name: string }
		>
	>((acc, { sum, userId, currencyCode, name }) => {
		if (!acc.has(userId)) {
			acc.set(userId, { name, items: [] });
		}
		acc.get(userId)!.items.push({ currencyCode, sum: Number(sum) });
		return acc;
	}, new Map());
	const debtsByUsersEntries = [...debtsByUsers.entries()];

	return debtsByUsersEntries
		.sort(([, { name: nameA }], [, { name: nameB }]) =>
			nameA.localeCompare(nameB),
		)
		.map(([userId, { items }]) => ({
			userId,
			debts: items.sort((itemA, itemB) =>
				itemA.currencyCode.localeCompare(itemB.currencyCode),
			),
		}));
});
