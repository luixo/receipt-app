import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { partSchema } from "app/utils/validation";
import type { SimpleUpdateObject } from "next-app/db/types";
import { getAccessRole } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	receiptItemIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			itemId: receiptItemIdSchema,
			userId: userIdSchema,
			update: z.strictObject({
				type: z.literal("part"),
				part: partSchema,
			}),
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
				message: `Not enough rights to modify receipt "${receipt.id}".`,
			});
		}
		const itemParticipant = await database
			.selectFrom("itemParticipants")
			.where("itemParticipants.itemId", "=", input.itemId)
			.where("itemParticipants.userId", "=", input.userId)
			.select([])
			.executeTakeFirst();
		if (!itemParticipant) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not participate in item "${input.itemId}" of the receipt "${receipt.id}".`,
			});
		}
		let setObject: SimpleUpdateObject<"itemParticipants"> = {};
		switch (input.update.type) {
			case "part":
				setObject = { part: input.update.part.toString() };
				break;
		}
		await database
			.updateTable("itemParticipants")
			.set(setObject)
			.where("userId", "=", input.userId)
			.where("itemId", "=", input.itemId)
			.executeTakeFirst();
	});
