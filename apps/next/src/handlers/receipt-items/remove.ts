import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getAccessRole } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptItemIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptItemIdSchema,
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
		await database
			.deleteFrom("receiptItems")
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
