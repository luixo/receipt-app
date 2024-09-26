import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "~app/utils/validation";
import type { ReceiptItemsId } from "~db/models";
import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { receiptIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			name: receiptItemNameSchema,
			price: priceSchema,
			quantity: quantitySchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receipts")
			.select(["ownerAccountId", "id", "lockedTimestamp"])
			.where("id", "=", input.receiptId)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId,
		);
		if (!accessRole) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${receipt.id}" is not allowed to be modified by "${ctx.auth.email}"`,
			});
		}
		if (accessRole !== "owner" && accessRole !== "editor") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${receipt.id}" is not allowed to be modified by "${ctx.auth.email}" with role "${accessRole}"`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${input.receiptId}" cannot be updated while locked.`,
			});
		}
		const id: ReceiptItemsId = ctx.getUuid();
		const now = new Date();
		await database
			.insertInto("receiptItems")
			.values({
				id,
				name: input.name,
				price: input.price.toString(),
				quantity: input.quantity.toString(),
				receiptId: input.receiptId,
				createdAt: now,
			})
			.executeTakeFirst();
		return { id, createdAt: now };
	});
