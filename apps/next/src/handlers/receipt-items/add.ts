import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "app/utils/validation";
import { getDatabase } from "next-app/db";
import {
	getAccessRole,
	getReceiptById,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			name: receiptItemNameSchema,
			price: priceSchema,
			quantity: quantitySchema,
		})
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
			"id",
			"lockedTimestamp",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.receiptId}`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Receipt ${input.receiptId} cannot be updated while locked.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId
		);
		if (accessRole !== "owner" && accessRole !== "editor") {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt ${receipt.id} is not allowed to be modified by ${
					ctx.auth.accountId
				} with role ${accessRole || "nobody"}`,
			});
		}
		const id = v4();
		await database
			.insertInto("receiptItems")
			.values({
				id,
				name: input.name,
				price: input.price.toString(),
				quantity: input.quantity.toString(),
				receiptId: input.receiptId,
			})
			.executeTakeFirst();
		return id;
	});
