import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "~app/utils/validation";
import type { SimpleUpdateObject } from "~db/types";
import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { receiptItemIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptItemIdSchema,
			update: z.discriminatedUnion("type", [
				z.strictObject({
					type: z.literal("name"),
					name: receiptItemNameSchema,
				}),
				z.strictObject({ type: z.literal("price"), price: priceSchema }),
				z.strictObject({
					type: z.literal("quantity"),
					quantity: quantitySchema,
				}),
			]),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receiptItem = await database
			.selectFrom("receiptItems")
			.innerJoin("receipts", (qb) =>
				qb.onRef("receipts.id", "=", "receiptItems.receiptId"),
			)
			.select([
				"receipts.id as receiptId",
				"receipts.ownerAccountId",
				"receipts.lockedTimestamp",
			])
			.where("receiptItems.id", "=", input.id)
			.executeTakeFirst();
		if (!receiptItem) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${input.id}" is not found.`,
			});
		}
		if (receiptItem.lockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${receiptItem.receiptId}" cannot be updated while locked.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			{ id: receiptItem.receiptId, ownerAccountId: receiptItem.ownerAccountId },
			ctx.auth.accountId,
		);
		if (!accessRole) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${receiptItem.receiptId}" is not allowed to be modified by "${ctx.auth.email}".`,
			});
		}
		if (accessRole !== "owner" && accessRole !== "editor") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${receiptItem.receiptId}" is not allowed to be modified by "${ctx.auth.email}" with role "${accessRole}"`,
			});
		}
		let setObject: SimpleUpdateObject<"receiptItems"> = {};
		switch (input.update.type) {
			case "name":
				setObject = { name: input.update.name };
				break;
			case "price":
				setObject = { price: input.update.price.toString() };
				break;
			case "quantity":
				setObject = { quantity: input.update.quantity.toString() };
				break;
		}
		await database
			.updateTable("receiptItems")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
