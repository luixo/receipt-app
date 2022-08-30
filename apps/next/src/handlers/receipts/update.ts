import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import { receiptNameSchema } from "app/utils/validation";
import { ReceiptsDatabase, getDatabase, Database } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { currencySchema, receiptIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("update", {
	input: z.strictObject({
		id: receiptIdSchema,
		update: z.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("name"),
				name: receiptNameSchema,
			}),
			z.strictObject({ type: z.literal("issued"), issued: z.date() }),
			z.strictObject({ type: z.literal("locked"), value: z.boolean() }),
			z.strictObject({ type: z.literal("currency"), currency: currencySchema }),
		]),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.id, [
			"ownerAccountId",
			"lockedTimestamp",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.id}`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt ${input.id} is not owned by ${ctx.auth.accountId}`,
			});
		}

		const updateTable = (
			localDatabase: Database,
			setObject: MutationObject<ReceiptsDatabase, "receipts", "receipts">
		) =>
			localDatabase
				.updateTable("receipts")
				.set(setObject)
				.where("id", "=", input.id)
				.executeTakeFirst();

		if (input.update.type === "locked") {
			if (receipt.ownerAccountId !== ctx.auth.accountId) {
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: `You don't have rights to change ${input.id} receipt locked state.`,
				});
			}
			if (input.update.value) {
				if (receipt.lockedTimestamp) {
					throw new trpc.TRPCError({
						code: "CONFLICT",
						message: `Receipt ${input.id} is already locked.`,
					});
				}
				await updateTable(database, { lockedTimestamp: new Date() });
				return;
			}
			if (!receipt.lockedTimestamp) {
				throw new trpc.TRPCError({
					code: "CONFLICT",
					message: `Receipt ${input.id} is not locked.`,
				});
			}
			await updateTable(database, { lockedTimestamp: null });
			return;
		}
		if (receipt.lockedTimestamp) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Receipt ${input.id} cannot be updated while locked.`,
			});
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
		}
		await updateTable(database, setObject);
	},
});
