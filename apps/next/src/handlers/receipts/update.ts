import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { receiptNameSchema } from "app/utils/validation";
import { SimpleUpdateObject } from "next-app/db/types";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	currencyCodeSchema,
	receiptIdSchema,
} from "next-app/handlers/validation";

type ReceiptUpdateObject = SimpleUpdateObject<"receipts">;

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
				z.strictObject({ type: z.literal("locked"), locked: z.boolean() }),
				z.strictObject({
					type: z.literal("currencyCode"),
					currencyCode: currencyCodeSchema,
				}),
			]),
		}),
	)
	.mutation(async ({ input, ctx }): Promise<ReceiptUpdateObject> => {
		const { database } = ctx;
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
		const setObject: ReceiptUpdateObject =
			receipt.lockedTimestamp === null
				? {}
				: {
						lockedTimestamp: new Date(),
				  };
		switch (input.update.type) {
			case "currencyCode":
				setObject.currencyCode = input.update.currencyCode;
				break;
			case "issued":
				setObject.issued = input.update.issued;
				// lockedTimestamp should not update if "issued" is changed
				setObject.lockedTimestamp = undefined;
				break;
			case "name":
				setObject.name = input.update.name;
				// lockedTimestamp should not update if "name" is changed
				setObject.lockedTimestamp = undefined;
				break;
			case "locked":
				setObject.lockedTimestamp = input.update.locked ? new Date() : null;
				break;
		}
		if (!receipt.lockedTimestamp && setObject.lockedTimestamp) {
			const emptyItems = await database
				.selectFrom("receiptItems")
				.where("receiptItems.receiptId", "=", input.id)
				.leftJoin("itemParticipants", (qb) =>
					qb.onRef("itemParticipants.itemId", "=", "receiptItems.id"),
				)
				.groupBy("receiptItems.id")
				.having(
					database.fn.sum<string>("itemParticipants.part"),
					"is",
					sql`null`,
				)
				.select("receiptItems.id")
				.executeTakeFirst();
			if (emptyItems) {
				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `Receipt ${input.id} has items with no participants.`,
				});
			}
		}

		await database
			.updateTable("receipts")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
		return setObject.lockedTimestamp === undefined
			? setObject
			: {
					...setObject,
					lockedTimestamp: setObject.lockedTimestamp || undefined,
			  };
	});
