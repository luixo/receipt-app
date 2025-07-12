import { TRPCError } from "@trpc/server";
import { unique } from "remeda";
import { z } from "zod";

import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "~app/utils/validation";
import type { ReceiptItemsId } from "~db/models";
import type { Temporal } from "~utils/date";
import type { BatchLoadContextFn } from "~web/handlers/batch";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { receiptIdSchema, roleSchema } from "~web/handlers/validation";

export const addItemSchema = z.strictObject({
	receiptId: receiptIdSchema,
	name: receiptItemNameSchema,
	price: priceSchema,
	quantity: quantitySchema,
});

export type ItemOutput = {
	id: ReceiptItemsId;
	createdAt: Temporal.ZonedDateTime;
};

const getData = async (
	ctx: AuthorizedContext,
	items: readonly z.infer<typeof addItemSchema>[],
) =>
	ctx.database
		.selectFrom("receipts")
		.where("receipts.id", "in", unique(items.map((item) => item.receiptId)))
		.leftJoin("receiptParticipants", (jb) =>
			jb.onRef("receipts.id", "=", "receiptParticipants.receiptId"),
		)
		.leftJoin("users", (jb) =>
			jb.onRef("users.id", "=", "receiptParticipants.userId"),
		)
		.leftJoin("accounts", (jb) =>
			jb
				.onRef("accounts.id", "=", "users.connectedAccountId")
				.on("accounts.id", "=", ctx.auth.accountId),
		)
		.select([
			"receipts.ownerAccountId",
			"receipts.id",
			"receiptParticipants.role",
		])
		.execute();

const getItemsOrErrors = (
	ctx: AuthorizedContext,
	items: readonly z.infer<typeof addItemSchema>[],
	receipts: Awaited<ReturnType<typeof getData>>,
) =>
	items.map((item) => {
		const matchedReceipt = receipts.find(
			(receipt) => receipt.id === item.receiptId,
		);
		if (!matchedReceipt) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${item.receiptId}" does not exist.`,
			});
		}
		if (matchedReceipt.ownerAccountId !== ctx.auth.accountId) {
			const parsed = roleSchema.safeParse(matchedReceipt.role);
			if (!matchedReceipt.role || !parsed.success) {
				return new TRPCError({
					code: "FORBIDDEN",
					message: `Receipt "${item.receiptId}" is not allowed to be modified by "${ctx.auth.email}"`,
				});
			}
			const accessRole = parsed.data;
			if (accessRole !== "owner" && accessRole !== "editor") {
				return new TRPCError({
					code: "FORBIDDEN",
					message: `Receipt "${item.receiptId}" is not allowed to be modified by "${ctx.auth.email}" with role "${accessRole}"`,
				});
			}
		}
		const id: ReceiptItemsId = ctx.getUuid();
		return {
			id,
			name: item.name,
			price: item.price.toString(),
			quantity: item.quantity.toString(),
			receiptId: item.receiptId,
		};
	});

const insertItems = (
	ctx: AuthorizedContext,
	items: Exclude<ReturnType<typeof getItemsOrErrors>[number], TRPCError>[],
) => {
	if (items.length === 0) {
		return [];
	}
	return ctx.database
		.insertInto("receiptItems")
		.values(items)
		.returning(["receiptItems.createdAt", "receiptItems.id"])
		.execute();
};

export const batchFn: BatchLoadContextFn<
	AuthorizedContext,
	z.infer<typeof addItemSchema>,
	ItemOutput,
	TRPCError
> = (ctx) => async (inputs) => {
	const data = await getData(ctx, inputs);
	const itemsOrErrors = getItemsOrErrors(ctx, inputs, data);
	const insertedItems = await insertItems(
		ctx,
		itemsOrErrors.filter(
			(item): item is Exclude<typeof item, TRPCError> =>
				!(item instanceof TRPCError),
		),
	);
	return itemsOrErrors.map((itemOrError) => {
		if (itemOrError instanceof TRPCError) {
			return itemOrError;
		}
		const matchedItem = insertedItems.find(
			(insertedItem) => insertedItem.id === itemOrError.id,
		);
		/* c8 ignore start */
		if (!matchedItem) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have matched inserted item for id "${itemOrError.id}".`,
			});
		}
		/* c8 ignore stop */
		return { id: itemOrError.id, createdAt: matchedItem.createdAt };
	});
};

export const procedure = authProcedure
	.input(addItemSchema)
	.mutation(queueCallFactory(batchFn));
