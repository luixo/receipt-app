import * as trpc from "@trpc/server";
import { z } from "zod";

import { debtAmountSchema, debtNoteSchema } from "app/utils/validation";
import type { SimpleUpdateObject } from "next-app/db/types";
import { authProcedure } from "next-app/handlers/trpc";
import { currencyCodeSchema, debtIdSchema } from "next-app/handlers/validation";

type DebtUpdateObject = SimpleUpdateObject<"debts">;

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: debtIdSchema,
			update: z.discriminatedUnion("type", [
				z.strictObject({
					type: z.literal("amount"),
					amount: debtAmountSchema,
				}),
				z.strictObject({
					type: z.literal("timestamp"),
					timestamp: z.date(),
				}),
				z.strictObject({
					type: z.literal("note"),
					note: debtNoteSchema,
				}),
				z.strictObject({
					type: z.literal("currencyCode"),
					currencyCode: currencyCodeSchema,
				}),
				z.strictObject({
					type: z.literal("locked"),
					locked: z.boolean(),
				}),
			]),
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
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Debt ${input.id} does not exist on account ${ctx.auth.accountId}.`,
			});
		}

		const setObject: DebtUpdateObject =
			debt.lockedTimestamp === null
				? {}
				: {
						lockedTimestamp: new Date(),
				  };
		switch (input.update.type) {
			case "amount":
				setObject.amount = input.update.amount.toString();
				break;
			case "timestamp":
				setObject.timestamp = input.update.timestamp;
				break;
			case "note":
				// Updating note should not affect lockedTimestamp
				setObject.lockedTimestamp = undefined;
				setObject.note = input.update.note;
				break;
			case "currencyCode":
				setObject.currencyCode = input.update.currencyCode;
				break;
			case "locked":
				setObject.lockedTimestamp = input.update.locked ? new Date() : null;
				break;
		}
		let reverseUpdated = false;
		if (debt.autoAcceptDebts) {
			const reverseSetObject = { ...setObject };
			if (reverseSetObject.note) {
				reverseSetObject.note = undefined;
			}
			if (reverseSetObject.amount) {
				reverseSetObject.amount = `-${reverseSetObject.amount}`;
			}
			if (!debt.foreignAccountId) {
				throw new trpc.TRPCError({
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
					.set(setObject)
					.where("id", "=", input.id)
					.where("ownerAccountId", "=", debt.foreignAccountId)
					.executeTakeFirst();
				reverseUpdated = reverseSetObject.lockedTimestamp !== undefined;
			}
		}
		await database
			.updateTable("debts")
			.set(setObject)
			.where("id", "=", input.id)
			.where("ownerAccountId", "=", ctx.auth.accountId)
			.executeTakeFirst();
		return {
			...(setObject.lockedTimestamp === undefined
				? undefined
				: { lockedTimestamp: setObject.lockedTimestamp || undefined }),
			reverseUpdated,
		};
	});
