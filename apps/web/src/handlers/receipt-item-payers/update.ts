import { TRPCError } from "@trpc/server";
import type { Updateable } from "kysely";
import { z } from "zod";

import { partSchema } from "~app/utils/validation";
import type { DB } from "~db/types.gen";
import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { receiptItemIdSchema, userIdSchema } from "~web/handlers/validation";

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
			.select(["receipts.id", "receipts.ownerAccountId"])
			.limit(1)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${input.itemId}" does not exist.`,
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
		const receiptItemPayer = await database
			.selectFrom("receiptItemPayers")
			.where((eb) =>
				eb.and({
					itemId: input.itemId,
					userId: input.userId,
				}),
			)
			.select([])
			.limit(1)
			.executeTakeFirst();
		if (!receiptItemPayer) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not pay for item "${input.itemId}" of the receipt "${receipt.id}".`,
			});
		}
		let setObject: Updateable<DB["receiptItemPayers"]> = {};
		switch (input.update.type) {
			// We want this to blow up in case we add more cases
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			case "part":
				setObject = { part: input.update.part.toString() };
				break;
		}
		await database
			.updateTable("receiptItemPayers")
			.set(setObject)
			.where((eb) =>
				eb.and({
					itemId: input.itemId,
					userId: input.userId,
				}),
			)
			.executeTakeFirst();
	});
