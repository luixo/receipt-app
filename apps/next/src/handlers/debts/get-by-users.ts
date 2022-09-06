import { ExtractMapValue } from "app/utils/types";
import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.query(async ({ ctx }) => {
	const database = getDatabase(ctx);
	const debts = await database
		.selectFrom("debts")
		.where("debts.ownerAccountId", "=", ctx.auth.accountId)
		.select([database.fn.sum<string>("amount").as("sum"), "currency", "userId"])
		.groupBy("userId")
		.groupBy("currency")
		.execute();

	type Debt = typeof debts[number];

	const debtsByUsers = debts.reduce<
		Map<UsersId, (Omit<Debt, "sum" | "userId"> & { sum: number })[]>
	>((acc, { sum, userId, ...debt }) => {
		if (!acc.has(userId)) {
			acc.set(userId, []);
		}
		acc.get(userId)!.push({ ...debt, sum: Number(sum) });
		return acc;
	}, new Map());
	const debtsByUsersEntries = [...debtsByUsers.entries()];

	return debtsByUsersEntries.reduce<
		Record<UsersId, ExtractMapValue<typeof debtsByUsers>>
	>((acc, [userId, userDebts]) => {
		acc[userId] = userDebts;
		return acc;
	}, {});
});
