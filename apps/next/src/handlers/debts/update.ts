import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import { debtNoteSchema } from "app/utils/validation";
import { getDatabase, Database } from "next-app/db";
import { ReceiptsDatabase } from "next-app/db/types";
import {
	getDebtIntention,
	statusSchema,
} from "next-app/handlers/debts-sync-intentions/utils";
import { getDebt } from "next-app/handlers/debts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	debtAmountSchema,
	currencySchema,
	debtIdSchema,
} from "next-app/handlers/validation";

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
					type: z.literal("currency"),
					currency: currencySchema,
				}),
				z.strictObject({
					type: z.literal("locked"),
					value: z.boolean(),
				}),
			]),
		})
	)
	.mutation(
		async ({
			input,
			ctx,
		}): Promise<z.infer<typeof statusSchema> | undefined> => {
			const database = getDatabase(ctx);
			const debt = await getDebt(database, input.id, ctx.auth.accountId, [
				"lockedTimestamp",
			]);
			if (!debt) {
				throw new trpc.TRPCError({
					code: "NOT_FOUND",
					message: `Debt ${input.id} does not exist on account ${ctx.auth.accountId}.`,
				});
			}

			const updateTable = (
				localDatabase: Database,
				setObject: MutationObject<ReceiptsDatabase, "debts", "debts">
			) =>
				localDatabase
					.updateTable("debts")
					.set(setObject)
					.where("id", "=", input.id)
					.where("ownerAccountId", "=", ctx.auth.accountId)
					.executeTakeFirst();

			if (input.update.type === "locked") {
				if (input.update.value) {
					if (debt.lockedTimestamp) {
						throw new trpc.TRPCError({
							code: "CONFLICT",
							message: `Debt ${input.id} is already locked.`,
						});
					}
					await updateTable(database, { lockedTimestamp: new Date() });
					const debtIntention = await getDebtIntention(
						database,
						input.id,
						ctx.auth.accountId
					);
					if (!debtIntention) {
						throw new trpc.TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: `Debt ${input.id} not found on debts update.`,
						});
					}
					if (!debtIntention.theirOwnerAccountId) {
						return ["nosync", undefined];
					}
					return [
						"unsync",
						debtIntention.intentionAccountId ? "remote" : undefined,
					];
				}
				if (!debt.lockedTimestamp) {
					throw new trpc.TRPCError({
						code: "CONFLICT",
						message: `Debt ${input.id} is not locked.`,
					});
				}
				await database.transaction().execute(async (tx) => {
					await updateTable(tx, { lockedTimestamp: null });
					await tx
						.deleteFrom("debtsSyncIntentions")
						.where("debtId", "=", input.id)
						.where("ownerAccountId", "=", ctx.auth.accountId)
						.execute();
				});
				return ["unsync", undefined];
			}
			if (debt.lockedTimestamp && input.update.type !== "note") {
				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `Debt ${input.id} cannot be updated while locked.`,
				});
			}
			if (input.update.type === "currency") {
				const debtIntention = await getDebtIntention(
					database,
					input.id,
					ctx.auth.accountId
				);
				if (!debtIntention) {
					throw new trpc.TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Debt ${input.id} not found on debts update.`,
					});
				}
				if (debtIntention.theirOwnerAccountId) {
					throw new trpc.TRPCError({
						code: "FORBIDDEN",
						message: `Debt ${input.id} currency cannot be updated as it exists on counterparty side as well.`,
					});
				}
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
			await updateTable(database, setObject);
		}
	);
