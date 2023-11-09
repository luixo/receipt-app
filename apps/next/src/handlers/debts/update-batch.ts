import { TRPCError } from "@trpc/server";

import type { NonNullableField } from "app/utils/types";
import { MAX_BATCH_DEBTS, MIN_BATCH_DEBTS } from "app/utils/validation";
import type { DebtsId } from "next-app/db/models";
import { authProcedure } from "next-app/handlers/trpc";

import { buildSetObjects, updateDebtSchema } from "./utils";

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
			.where(
				"debts.id",
				"in",
				inputs.map((input) => input.id),
			)
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.innerJoin("users", (qb) =>
				qb
					.onRef("users.id", "=", "debts.userId")
					.onRef("users.ownerAccountId", "=", "debts.ownerAccountId"),
			)
			.leftJoin("accountSettings", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accountSettings.accountId"),
			)
			.select([
				"debts.id",
				"debts.userId",
				"debts.lockedTimestamp",
				"accountSettings.accountId as foreignAccountId",
				"accountSettings.autoAcceptDebts",
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

		type DebtWithReverseSetObject = NonNullableField<
			(typeof setObjectsWithReverse)[number],
			"reverseSetObject"
		>;
		const autoAcceptedDebts = setObjectsWithReverse.filter(
			(setObject): setObject is DebtWithReverseSetObject =>
				Boolean(setObject.debt.autoAcceptDebts && setObject.reverseSetObject),
		);
		if (autoAcceptedDebts.length !== 0) {
			await database.transaction().execute((tx) =>
				Promise.all(
					autoAcceptedDebts.map(async ({ reverseSetObject, debt }) => {
						if (!debt.foreignAccountId) {
							throw new TRPCError({
								code: "INTERNAL_SERVER_ERROR",
								message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
							});
						}
						await tx
							.updateTable("debts")
							.set(reverseSetObject)
							.where("id", "=", debt.id)
							.where("ownerAccountId", "=", debt.foreignAccountId)
							.executeTakeFirst();
						if (reverseSetObject.lockedTimestamp !== undefined) {
							const matchedLockedTimestampObject = lockedTimestampObjects.find(
								({ debtId }) => debtId === debt.id,
							);
							if (matchedLockedTimestampObject) {
								matchedLockedTimestampObject.reverseLockedTimestampUpdated =
									true;
							}
						}
					}),
				),
			);
		}
		await database
			.transaction()
			.execute((tx) =>
				Promise.all(
					setObjectsWithReverse.map(({ setObject, debt }) =>
						tx
							.updateTable("debts")
							.set(setObject)
							.where("id", "=", debt.id)
							.where("ownerAccountId", "=", ctx.auth.accountId)
							.executeTakeFirst(),
					),
				),
			);
		return lockedTimestampObjects;
	});
