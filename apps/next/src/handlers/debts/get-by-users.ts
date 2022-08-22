import * as trpc from "@trpc/server";

import { ExtractMapValue } from "app/utils/types";
import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<AuthorizedContext>().query("get-by-users", {
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const debts = await database
			.selectFrom("debts")
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.select([
				database.fn.sum<string>("amount").as("sum"),
				"currency",
				"userId",
			])
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
	},
});
