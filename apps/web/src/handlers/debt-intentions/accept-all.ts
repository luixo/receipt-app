import { TRPCError } from "@trpc/server";

import type { DebtsId } from "~db/models";
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
			eb.or([
				eb("selfDebts.id", "is", null),
				eb
					.or([
						eb("selfDebts.amount", "<>", eb.neg(eb.ref("theirDebts.amount"))),
						eb(
							"selfDebts.currencyCode",
							"<>",
							eb.ref("theirDebts.currencyCode"),
						),
						eb("selfDebts.timestamp", "<>", eb.ref("theirDebts.timestamp")),
					])
					.and(eb("selfDebts.updatedAt", "<", eb.ref("theirDebts.updatedAt"))),
			]),
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
	const acceptedDebts: {
		id: DebtsId;
		updatedAt: Date;
	}[] = [];
	if (debtsToUpdate.length !== 0) {
		const updatedDebts = await database.transaction().execute((tx) =>
			Promise.all(
				debtsToUpdate.map(async (debt) => {
					const nextAmount = Number(debt.amount) * -1;
					const { updatedAt } = await tx
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
						})
						.returning(["debts.updatedAt"])
						.executeTakeFirstOrThrow();

					return { id: debt.id, updatedAt };
				}),
			),
		);
		acceptedDebts.push(...updatedDebts);
	}
	if (debtsToCreate.length !== 0) {
		const createdDebts = await database
			.insertInto("debts")
			.values(
				debtsToCreate.map((debt) => ({
					id: debt.id,
					ownerAccountId: ctx.auth.accountId,
					userId: debt.userId,
					currencyCode: debt.currencyCode,
					amount: (Number(debt.amount) * -1).toString(),
					timestamp: debt.timestamp,
					createdAt: new Date(),
					note: debt.note,
					receiptId: debt.receiptId,
				})),
			)
			.returning(["debts.id", "debts.updatedAt"])
			.execute();
		acceptedDebts.push(...createdDebts);
	}
	return acceptedDebts.sort(
		(a, b) =>
			a.updatedAt.valueOf() - b.updatedAt.valueOf() || a.id.localeCompare(b.id),
	);
});
