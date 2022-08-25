import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import { debtNoteSchema } from "app/utils/validation";
import { ReceiptsDatabase, getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getDebt } from "next-app/handlers/debts/utils";
import {
	debtAmountSchema,
	currencySchema,
	debtIdSchema,
} from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("update", {
	input: z.strictObject({
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
				type: z.literal("currency"),
				currency: currencySchema,
			}),
		]),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const debt = await getDebt(database, input.id, ctx.auth.accountId, []);
		if (!debt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Debt ${input.id} does not exist on account ${ctx.auth.accountId}.`,
			});
		}
		let setObject: MutationObject<ReceiptsDatabase, "debts", "debts"> = {};
		switch (input.update.type) {
			case "amount":
				setObject = { amount: input.update.amount.toString() };
				break;
			case "timestamp":
				setObject = { timestamp: input.update.timestamp };
				break;
			case "note":
				setObject = { note: input.update.note };
				break;
			case "currency":
				setObject = { currency: input.update.currency };
				break;
		}
		await getDatabase(ctx)
			.updateTable("debts")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	},
});
