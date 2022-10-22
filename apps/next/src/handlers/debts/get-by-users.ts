import { Currency } from "app/utils/currency";
import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const database = getDatabase(ctx);
	const debts = await database
		.selectFrom("debts")
		.where("debts.ownerAccountId", "=", ctx.auth.accountId)
		.innerJoin("users", (qb) => qb.onRef("users.id", "=", "debts.userId"))
		.select([
			database.fn.sum<string>("debts.amount").as("sum"),
			"debts.currency",
			"debts.userId",
			"users.name",
		])
		.having(database.fn.sum<string>("debts.amount"), ">", "0")
		.groupBy("debts.userId")
		.groupBy("users.name")
		.groupBy("currency")
		.execute();

	const debtsByUsers = debts.reduce<
		Map<UsersId, { items: { currency: Currency; sum: number }[]; name: string }>
	>((acc, { sum, userId, currency, name }) => {
		if (!acc.has(userId)) {
			acc.set(userId, { name, items: [] });
		}
		acc.get(userId)!.items.push({ currency, sum: Number(sum) });
		return acc;
	}, new Map());
	const debtsByUsersEntries = [...debtsByUsers.entries()];

	return debtsByUsersEntries
		.sort(([, { name: nameA }], [, { name: nameB }]) =>
			nameA.localeCompare(nameB)
		)
		.map(([userId, { items }]) => ({ userId, debts: items }));
});
