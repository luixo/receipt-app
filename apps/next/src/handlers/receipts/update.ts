import * as trpc from "@trpc/server";
import { MutationObject, sql } from "kysely";
import { z } from "zod";

import { receiptNameSchema } from "app/utils/validation";
import { getDatabase, Database } from "next-app/db";
import { ReceiptsDatabase } from "next-app/db/types";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	currencyCodeSchema,
	receiptIdSchema,
} from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptIdSchema,
			update: z.discriminatedUnion("type", [
				z.strictObject({
					type: z.literal("name"),
					name: receiptNameSchema,
				}),
				z.strictObject({ type: z.literal("issued"), issued: z.date() }),
				z.strictObject({ type: z.literal("locked"), value: z.boolean() }),
				z.strictObject({
					type: z.literal("currencyCode"),
					currencyCode: currencyCodeSchema,
				}),
			]),
		})
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.id, [
			"ownerAccountId",
			"lockedTimestamp",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.id}`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt ${input.id} is not owned by ${ctx.auth.accountId}`,
			});
		}

		const updateTable = (
			localDatabase: Database,
			setObject: MutationObject<ReceiptsDatabase, "receipts", "receipts">
		) =>
			localDatabase
				.updateTable("receipts")
				.set(setObject)
				.where("id", "=", input.id)
				.executeTakeFirst();

		if (input.update.type === "locked") {
			if (receipt.ownerAccountId !== ctx.auth.accountId) {
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: `You don't have rights to change ${input.id} receipt locked state.`,
				});
			}
			const emptyItems = await database
				.selectFrom("receiptItems")
				.where("receiptItems.receiptId", "=", input.id)
				.leftJoin("itemParticipants", (qb) =>
					qb.onRef("itemParticipants.itemId", "=", "receiptItems.id")
				)
				.groupBy("receiptItems.id")
				.having(
					database.fn.sum<string>("itemParticipants.part"),
					"is",
					sql`null`
				)
				.select("receiptItems.id")
				.executeTakeFirst();
			if (emptyItems) {
				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `Receipt ${input.id} has items with no participants.`,
				});
			}
			if (input.update.value) {
				if (receipt.lockedTimestamp) {
					throw new trpc.TRPCError({
						code: "CONFLICT",
						message: `Receipt ${input.id} is already locked.`,
					});
				}
				await updateTable(database, { lockedTimestamp: new Date() });
				return;
			}
			if (!receipt.lockedTimestamp) {
				throw new trpc.TRPCError({
					code: "CONFLICT",
					message: `Receipt ${input.id} is not locked.`,
				});
			}
			await updateTable(database, { lockedTimestamp: null });
			return;
		}
		if (receipt.lockedTimestamp) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Receipt ${input.id} cannot be updated while locked.`,
			});
		}
		let setObject: MutationObject<ReceiptsDatabase, "receipts", "receipts"> =
			{};
		switch (input.update.type) {
			case "currencyCode":
				setObject = { currencyCode: input.update.currencyCode };
				break;
			case "issued":
				setObject = { issued: input.update.issued };
				break;
			case "name":
				setObject = { name: input.update.name };
				break;
		}
		await updateTable(database, setObject);
	});
