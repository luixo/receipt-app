import { TRPCError } from "@trpc/server";

import { MAX_BATCH_DEBTS, MIN_BATCH_DEBTS } from "app/utils/validation";
import type { DebtsId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";

import {
	buildSetObjects,
	updateDebtSchema,
	upsertAutoAcceptedDebts,
} from "./utils";

export const procedure = authProcedure
	.input(
		updateDebtSchema
			.array()
			.max(
				MAX_BATCH_DEBTS,
				`Maximum amount of batched debts is ${MAX_BATCH_DEBTS}`,
			)
			.min(
				MIN_BATCH_DEBTS,
				`Minimal amount of batched debts is ${MIN_BATCH_DEBTS}`,
			),
	)
	.mutation(async ({ input: inputs, ctx }) => {
		const { database } = ctx;

		const debts = await database
			.selectFrom("debts")
			.where((eb) =>
				eb(
					"debts.id",
					"in",
					inputs.map((input) => input.id),
				).and("debts.ownerAccountId", "=", ctx.auth.accountId),
			)
			.innerJoin("users", (qb) =>
				qb
					.onRef("users.id", "=", "debts.userId")
					.onRef("users.ownerAccountId", "=", "debts.ownerAccountId"),
			)
			.leftJoin("accountSettings", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
			)
			.leftJoin("users as usersTheir", (qb) =>
				qb
					.onRef("usersTheir.connectedAccountId", "=", "debts.ownerAccountId")
					.onRef("usersTheir.ownerAccountId", "=", "accountSettings.accountId"),
			)
			.select([
				"debts.id",
				"debts.userId",
				"debts.lockedTimestamp",
				"debts.note",
				"debts.currencyCode",
				"debts.amount",
				"debts.timestamp",
				"debts.receiptId",
				"accountSettings.accountId as foreignAccountId",
				"accountSettings.autoAcceptDebts",
				"usersTheir.id as theirUserId",
			])
			.execute();
		const debtIds = debts.map((debt) => debt.id);
		const missingDebtIds = inputs
			.filter((input) => !debtIds.includes(input.id))
			.map((input) => input.id);
		if (missingDebtIds.length !== 0) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Debt${missingDebtIds.length === 1 ? "" : "s"} ${missingDebtIds
					.map((debtId) => `"${debtId}"`)
					.join(", ")} ${
					missingDebtIds.length === 1 ? "does" : "do"
				} not exist on account "${ctx.auth.email}".`,
			});
		}

		const setObjectsWithReverse = inputs.map((input) => {
			const matchedDebt = debts.find((debt) => debt.id === input.id)!;
			return { ...buildSetObjects(input, matchedDebt), debt: matchedDebt };
		});
		type LockedTimestampObject = {
			lockedTimestamp: Date | null;
			debtId: DebtsId;
			reverseLockedTimestampUpdated: boolean;
		};
		const lockedTimestampObjects = setObjectsWithReverse
			.map(({ setObject, debt }) => ({
				lockedTimestamp: setObject.lockedTimestamp,
				debtId: debt.id,
				reverseLockedTimestampUpdated: false,
			}))
			.filter(
				(obj): obj is LockedTimestampObject =>
					obj.lockedTimestamp !== undefined,
			);

		const autoAcceptedDebts = setObjectsWithReverse.filter((setObject) =>
			Boolean(setObject.debt.autoAcceptDebts),
		);
		if (autoAcceptedDebts.length !== 0) {
			const { newDebts } = await upsertAutoAcceptedDebts(
				database,
				autoAcceptedDebts.map(({ setObject, reverseSetObject, debt }) => {
					/* c8 ignore start */
					if (!debt.foreignAccountId) {
						throw new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
						});
					}
					if (!debt.theirUserId) {
						throw new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: `Unexpected having "autoAcceptDebts" but not having "theirUserId"`,
						});
					}
					/* c8 ignore stop */
					return {
						id: debt.id,
						ownerAccountId: debt.foreignAccountId,
						userId: debt.theirUserId,
						currencyCode: debt.currencyCode,
						amount: (-debt.amount).toString(),
						timestamp: debt.timestamp,
						lockedTimestamp: debt.lockedTimestamp,
						receiptId: debt.receiptId,
						created: new Date(),
						...reverseSetObject,
						// In case debt doesn't exist - we need to set a new note, not the old one
						note: setObject.note || debt.note,
						isNew: false,
					};
				}),
			);
			autoAcceptedDebts.forEach(({ reverseSetObject, debt }) => {
				const matchedNewDebt = newDebts.find(({ id }) => id === debt.id);
				if (matchedNewDebt || reverseSetObject?.lockedTimestamp !== undefined) {
					const matchedLockedTimestampObject = lockedTimestampObjects.find(
						({ debtId }) => debtId === debt.id,
					);
					if (matchedLockedTimestampObject) {
						matchedLockedTimestampObject.reverseLockedTimestampUpdated = true;
					}
				}
			});
		}
		await database.transaction().execute((tx) =>
			Promise.all(
				setObjectsWithReverse.map(({ setObject, debt }) =>
					tx
						.updateTable("debts")
						.set(setObject)
						.where((eb) =>
							eb.and({
								id: debt.id,
								ownerAccountId: ctx.auth.accountId,
							}),
						)
						.executeTakeFirst(),
				),
			),
		);
		return lockedTimestampObjects;
	});
