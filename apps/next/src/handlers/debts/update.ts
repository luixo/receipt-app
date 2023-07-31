import * as trpc from "@trpc/server";
import { z } from "zod";

import { debtNoteSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { SimpleUpdateObject } from "next-app/db/types";
import { getDebt } from "next-app/handlers/debts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	debtAmountSchema,
	currencyCodeSchema,
	debtIdSchema,
} from "next-app/handlers/validation";

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
	.mutation(
		async ({ input, ctx }): Promise<{ lockedTimestamp?: Date } | undefined> => {
			const database = getDatabase(ctx);
			const debt = await getDebt(database, input.id, ctx.auth.accountId, [
				"debts.lockedTimestamp",
			]);
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
			await database
				.updateTable("debts")
				.set(setObject)
				.where("id", "=", input.id)
				.where("ownerAccountId", "=", ctx.auth.accountId)
				.executeTakeFirst();
			return setObject.lockedTimestamp === undefined
				? undefined
				: { lockedTimestamp: setObject.lockedTimestamp || undefined };
		},
	);
