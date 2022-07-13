import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import { VALIDATIONS_CONSTANTS } from "app/utils/validation";

import { ReceiptsDatabase, getDatabase } from "../../db";
import { ReceiptsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { currency, flavored } from "../zod";

import { getReceiptById } from "./utils";

export const router = trpc.router<AuthorizedContext>().mutation("update", {
	input: z.strictObject({
		id: z.string().uuid().refine<ReceiptsId>(flavored),
		update: z.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("name"),
				name: z
					.string()
					.min(VALIDATIONS_CONSTANTS.receiptName.min)
					.max(VALIDATIONS_CONSTANTS.receiptName.max),
			}),
			z.strictObject({ type: z.literal("issued"), issued: z.instanceof(Date) }),
			z.strictObject({ type: z.literal("resolved"), resolved: z.boolean() }),
			z.strictObject({ type: z.literal("currency"), currency }),
		]),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.id, [
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.id}`,
			});
		}
		if (input.update.type === "name" || input.update.type === "issued") {
			if (receipt.ownerAccountId !== ctx.auth.accountId) {
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: `Receipt ${input.id} is not owned by ${ctx.auth.accountId}`,
				});
			}
		}
		let setObject: MutationObject<ReceiptsDatabase, "receipts", "receipts"> =
			{};
		switch (input.update.type) {
			case "currency":
				setObject = { currency: input.update.currency };
				break;
			case "issued":
				setObject = { issued: input.update.issued };
				break;
			case "name":
				setObject = { name: input.update.name };
				break;
			case "resolved":
				setObject = { resolved: input.update.resolved };
				break;
		}
		await database
			.updateTable("receipts")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	},
});
