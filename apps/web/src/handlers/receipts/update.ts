import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { receiptNameSchema } from "~app/utils/validation";
import type { SimpleUpdateObject } from "~db/types";
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
				z.strictObject({
					type: z.literal("currencyCode"),
					currencyCode: currencyCodeSchema,
				}),
			]),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receipts")
			.select(["ownerAccountId"])
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
		const setObject: ReceiptUpdateObject = {};
		switch (input.update.type) {
			case "currencyCode":
				setObject.currencyCode = input.update.currencyCode;
				break;
			case "issued":
				setObject.issued = input.update.issued;
				break;
			case "name":
				setObject.name = input.update.name;
				break;
		}

		await database
			.updateTable("receipts")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
