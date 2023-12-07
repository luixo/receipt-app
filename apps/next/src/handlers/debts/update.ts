import { TRPCError } from "@trpc/server";

import { authProcedure } from "next-app/handlers/trpc";

import { buildSetObjects, updateDebtSchema } from "./utils";

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
			.select([
				"debts.lockedTimestamp",
				"accountSettings.accountId as foreignAccountId",
				"accountSettings.autoAcceptDebts",
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
		if (debt.autoAcceptDebts && reverseSetObject) {
			const { foreignAccountId } = debt;
			/* c8 ignore start */
			if (!foreignAccountId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			/* c8 ignore stop */
			await database
				.updateTable("debts")
				.set(reverseSetObject)
				.where((eb) =>
					eb.and({ id: input.id, ownerAccountId: foreignAccountId }),
				)
				.executeTakeFirst();
			reverseLockedTimestampUpdated =
				reverseSetObject.lockedTimestamp !== undefined;
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
