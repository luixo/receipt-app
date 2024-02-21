import { TRPCError } from "@trpc/server";

import { authProcedure } from "next-app/handlers/trpc";

import {
	buildSetObjects,
	updateDebtSchema,
	upsertAutoAcceptedDebts,
} from "./utils";

export const procedure = authProcedure
	.input(updateDebtSchema)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const debt = await database
			.selectFrom("debts")
			.where((eb) =>
				eb.and({
					"debts.id": input.id,
					"debts.ownerAccountId": ctx.auth.accountId,
				}),
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
			.executeTakeFirst();
		if (!debt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Debt "${input.id}" does not exist on account "${ctx.auth.email}".`,
			});
		}

		const { setObject, reverseSetObject } = buildSetObjects(input, debt);
		let reverseLockedTimestampUpdated = false;
		if (debt.autoAcceptDebts) {
			const { foreignAccountId } = debt;
			/* c8 ignore start */
			if (!foreignAccountId) {
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
			const { newDebts } = await upsertAutoAcceptedDebts(database, [
				{
					id: input.id,
					ownerAccountId: foreignAccountId,
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
				},
			]);
			const isNewDebt = newDebts.some(({ id }) => id === input.id);
			reverseLockedTimestampUpdated =
				isNewDebt || reverseSetObject?.lockedTimestamp !== undefined;
		}
		await database
			.updateTable("debts")
			.set(setObject)
			.where((eb) =>
				eb.and({
					id: input.id,
					ownerAccountId: ctx.auth.accountId,
				}),
			)
			.executeTakeFirst();
		return {
			// value or null for set object, undefined for not being set
			lockedTimestamp: setObject.lockedTimestamp,
			reverseLockedTimestampUpdated,
		};
	});
