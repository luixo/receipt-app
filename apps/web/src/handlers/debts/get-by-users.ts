import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~db/models";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";

const getUnsyncedUsersDebts = async (ctx: AuthorizedContext) => {
	const { database } = ctx;
	const selfUnsyncedDebts = database
		.selectFrom("debts as selfDebts")
		.where("selfDebts.ownerAccountId", "=", ctx.auth.accountId)
		.innerJoin("users", (qb) =>
			qb
				.onRef("users.id", "=", "selfDebts.userId")
				.on("users.connectedAccountId", "is not", null),
		)
		.leftJoin("debts as theirDebts", (qb) =>
			qb
				.onRef("theirDebts.id", "=", "selfDebts.id")
				.onRef("theirDebts.ownerAccountId", "<>", "selfDebts.ownerAccountId"),
		)
		.where((eb) =>
			eb.or([
				eb("theirDebts.id", "is", null),
				eb("selfDebts.amount", "<>", eb.neg(eb.ref("theirDebts.amount"))),
				eb("selfDebts.currencyCode", "<>", eb.ref("theirDebts.currencyCode")),
				eb("selfDebts.timestamp", "<>", eb.ref("theirDebts.timestamp")),
			]),
		)
		.select([
			"users.name as name",
			"users.id as userId",
			"selfDebts.id as debtId",
		]);
	const foreignUnsyncedDebts = database
		.selectFrom("users")
		.where((eb) =>
			eb("users.connectedAccountId", "=", ctx.auth.accountId).and(
				"users.ownerAccountId",
				"<>",
				ctx.auth.accountId,
			),
		)
		.innerJoin("debts as theirDebts", (qb) =>
			qb.onRef("theirDebts.userId", "=", "users.id"),
		)
		.leftJoin("debts as selfDebts", (qb) =>
			qb
				.onRef("theirDebts.id", "=", "selfDebts.id")
				.onRef("selfDebts.ownerAccountId", "=", "users.connectedAccountId"),
		)
		.innerJoin("users as usersMine", (qb) =>
			qb
				.onRef("usersMine.connectedAccountId", "=", "theirDebts.ownerAccountId")
				.onRef("usersMine.ownerAccountId", "=", "users.connectedAccountId"),
		)
		.where((eb) => eb("selfDebts.id", "is", null))
		.select([
			"usersMine.name as name",
			"usersMine.id as userId",
			"theirDebts.id as debtId",
		]);
	return database
		.selectFrom(foreignUnsyncedDebts.union(selfUnsyncedDebts).as("union"))
		.select([
			"union.name",
			"union.userId",
			(eb) => eb.fn.count<string>("union.debtId").as("unsyncedDebts"),
		])
		.groupBy(["union.userId", "union.name"])
		.execute();
};

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
		getUnsyncedUsersDebts(ctx),
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
				unsyncedUsers.find((user) => user.userId === userId)?.unsyncedDebts ??
				"0";
			return {
				userId,
				unsyncedDebtsAmount: Number(unsyncedDebts),
				debts: items.sort((itemA, itemB) =>
					itemA.currencyCode.localeCompare(itemB.currencyCode),
				),
			};
		});
});
