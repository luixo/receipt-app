import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { omitUndefined } from "app/utils/utils";
import { debtAmountSchema, debtNoteSchema } from "app/utils/validation";
import type { SimpleUpdateObject } from "next-app/db/types";
import { authProcedure } from "next-app/handlers/trpc";
import { currencyCodeSchema, debtIdSchema } from "next-app/handlers/validation";

type DebtUpdateObject = SimpleUpdateObject<"debts">;

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: debtIdSchema,
			update: z
				.strictObject({
					amount: debtAmountSchema,
					timestamp: z.date(),
					note: debtNoteSchema,
					currencyCode: currencyCodeSchema,
					locked: z.boolean(),
				})
				.partial()
				.refine(
					(obj) => Object.keys(obj).length !== 0,
					"Update object has to have at least one key to update",
				),
		}),
	)
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

		const setObject: DebtUpdateObject = omitUndefined({
			amount: input.update.amount?.toString(),
			timestamp: input.update.timestamp,
			note: input.update.note,
			currencyCode: input.update.currencyCode,
			lockedTimestamp:
				input.update.locked === undefined
					? debt.lockedTimestamp === null
						? undefined
						: new Date()
					: input.update.locked
					? new Date()
					: null,
		});
		const modifiedKeys = Object.keys(input.update);
		if (modifiedKeys.length === 1 && modifiedKeys[0] === "note") {
			// don't update lockedTimestamp if we updated only note
			delete setObject.lockedTimestamp;
		}
		let reverseLockedTimestampUpdated = false;
		if (debt.autoAcceptDebts) {
			const reverseSetObject = {
				...setObject,
				note: undefined,
				amount: setObject.amount ? `-${setObject.amount}` : undefined,
			};
			if (!debt.foreignAccountId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Unexpected having "autoAcceptDebts" but not having "accountId"`,
				});
			}
			if (
				Object.values(reverseSetObject).filter((value) => value !== undefined)
					.length !== 0
			) {
				await database
					.updateTable("debts")
					.set(reverseSetObject)
					.where("id", "=", input.id)
					.where("ownerAccountId", "=", debt.foreignAccountId)
					.executeTakeFirst();
				reverseLockedTimestampUpdated =
					reverseSetObject.lockedTimestamp !== undefined;
			}
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
