import { TRPCError } from "@trpc/server";

import { authProcedure } from "next-app/handlers/trpc";

import { buildSetObjects, updateDebtSchema } from "./utils";

export const procedure = authProcedure
	.input(updateDebtSchema)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const debt = await database
			.selectFrom("debts")
			.where("debts.id", "=", input.id)
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
			if (!debt.foreignAccountId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			await database
				.updateTable("debts")
				.set(reverseSetObject)
				.where("id", "=", input.id)
				.where("ownerAccountId", "=", debt.foreignAccountId)
				.executeTakeFirst();
			reverseLockedTimestampUpdated =
				reverseSetObject.lockedTimestamp !== undefined;
		}
		await database
			.updateTable("debts")
			.set(setObject)
			.where("id", "=", input.id)
			.where("ownerAccountId", "=", ctx.auth.accountId)
			.executeTakeFirst();
		return {
			// value or null for set object, undefined for not being set
			lockedTimestamp: setObject.lockedTimestamp,
			reverseLockedTimestampUpdated,
		};
	});
