import { TRPCError } from "@trpc/server";

import type { DebtsId } from "~db";
import type { NonNullableField } from "~utils/types";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
	const debts = await database
		.selectFrom("users as usersTheir")
		.where((eb) =>
			eb("usersTheir.connectedAccountId", "=", ctx.auth.accountId).and(
				"usersTheir.ownerAccountId",
				"<>",
				ctx.auth.accountId,
			),
		)
		.innerJoin("debts as theirDebts", (qb) =>
			qb.onRef("theirDebts.userId", "=", "usersTheir.id"),
		)
		.where("theirDebts.lockedTimestamp", "is not", null)
		.leftJoin("debts as selfDebts", (qb) =>
			qb
				.onRef("theirDebts.id", "=", "selfDebts.id")
				.onRef(
					"selfDebts.ownerAccountId",
					"=",
					"usersTheir.connectedAccountId",
				),
		)
		.where((eb) =>
			eb("selfDebts.id", "is", null).or(
				"selfDebts.lockedTimestamp",
				"<",
				eb.ref("theirDebts.lockedTimestamp"),
			),
		)
		.innerJoin("users as usersMine", (qb) =>
			qb
				.onRef("usersMine.connectedAccountId", "=", "theirDebts.ownerAccountId")
				.onRef(
					"usersMine.ownerAccountId",
					"=",
					"usersTheir.connectedAccountId",
				),
		)
		.select([
			"theirDebts.id",
			"theirDebts.ownerAccountId",
			"theirDebts.timestamp",
			"theirDebts.lockedTimestamp",
			"theirDebts.amount",
			"theirDebts.currencyCode",
			"theirDebts.receiptId",
			"theirDebts.note",
			"usersMine.id as userId",
			"selfDebts.id as selfId",
		])
		.execute();
	if (debts.length === 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Expected to have at least one debt to accept.`,
		});
	}
	const debtsToUpdate = debts.filter(
		(debt): debt is NonNullableField<typeof debt, "selfId"> =>
			debt.selfId !== null,
	);
	const debtsToCreate = debts.filter(
		(debt) => !debtsToUpdate.includes(debt as (typeof debtsToUpdate)[number]),
	);
	const debtsResult: { created: Date; id: DebtsId }[] = [];
	if (debtsToUpdate.length !== 0) {
		debtsResult.push(
			...(await database.transaction().execute((tx) =>
				Promise.all(
					debtsToUpdate.map(async (debt) => {
						const nextAmount = Number(debt.amount) * -1;
						const result = await tx
							.updateTable("debts")
							.where((eb) =>
								eb.and({
									id: debt.selfId,
									ownerAccountId: ctx.auth.accountId,
								}),
							)
							.set({
								amount: nextAmount.toString(),
								currencyCode: debt.currencyCode,
								timestamp: debt.timestamp,
								lockedTimestamp: debt.lockedTimestamp,
							})
							.returning("debts.created")
							.executeTakeFirstOrThrow();

						return { created: result.created, id: debt.id };
					}),
				),
			)),
		);
	}
	if (debtsToCreate.length !== 0) {
		debtsResult.push(
			...(await database.transaction().execute((tx) =>
				Promise.all(
					debtsToCreate.map(async (debt) => {
						const createdTimestamp = new Date();
						const nextAmount = Number(debt.amount) * -1;
						await tx
							.insertInto("debts")
							.values({
								id: debt.id,
								ownerAccountId: ctx.auth.accountId,
								userId: debt.userId,
								currencyCode: debt.currencyCode,
								amount: nextAmount.toString(),
								timestamp: debt.timestamp,
								created: createdTimestamp,
								note: debt.note,
								lockedTimestamp: debt.lockedTimestamp,
								receiptId: debt.receiptId,
							})
							.execute();
						return { created: createdTimestamp, id: debt.id };
					}),
				),
			)),
		);
	}
	return debtsResult;
});
