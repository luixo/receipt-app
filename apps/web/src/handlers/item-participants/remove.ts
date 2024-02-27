import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { receiptItemIdSchema, userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			itemId: receiptItemIdSchema,
			userId: userIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receiptItems")
			.where("receiptItems.id", "=", input.itemId)
			.innerJoin("receipts", (qb) =>
				qb.onRef("receipts.id", "=", "receiptItems.receiptId"),
			)
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "receipts.ownerAccountId"),
			)
			.select([
				"receipts.id",
				"receipts.ownerAccountId",
				"receipts.lockedTimestamp",
			])
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${input.itemId}" does not exist.`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${receipt.id}" cannot be updated while locked.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId,
		);
		if (accessRole !== "owner" && accessRole !== "editor") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to remove item from receipt "${receipt.id}".`,
			});
		}
		const deleteResult = await database
			.deleteFrom("itemParticipants")
			.where((eb) =>
				eb.and({
					itemId: input.itemId,
					userId: input.userId,
				}),
			)
			.returning("itemParticipants.userId")
			.executeTakeFirst();
		if (!deleteResult) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Item participant "${input.userId}" on item "${input.itemId}" on receipt "${receipt.id}" doesn't exist.`,
			});
		}
	});
