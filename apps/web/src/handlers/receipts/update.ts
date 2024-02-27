import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { receiptNameSchema } from "~app/utils/validation";
import type { SimpleUpdateObject } from "~web/db/types";
import { authProcedure } from "~web/handlers/trpc";
import { currencyCodeSchema, receiptIdSchema } from "~web/handlers/validation";

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
		const receipt = await database
			.selectFrom("receipts")
			.select(["ownerAccountId", "lockedTimestamp"])
			.where("id", "=", input.id)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No receipt found by id "${input.id}".`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${input.id}" is not owned by "${ctx.auth.email}".`,
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
				.having(database.fn.sum<string>("itemParticipants.part"), "is", null)
				.select("receiptItems.id")
				.executeTakeFirst();
			if (emptyItems) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Receipt "${input.id}" has items with no participants.`,
				});
			}
		}

		await database
			.updateTable("receipts")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
		return setObject.lockedTimestamp === undefined
			? {}
			: { lockedTimestamp: setObject.lockedTimestamp || undefined };
	});
