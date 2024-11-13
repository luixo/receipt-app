import { TRPCError } from "@trpc/server";
import { values } from "remeda";
import { z } from "zod";

import { receiptNameSchema } from "~app/utils/validation";
import type { ReceiptItemsId, ReceiptsId } from "~db/models";
import type { AuthorizedContext } from "~web/handlers/context";
import {
	batchFn as addConsumers,
	addItemConsumerSchema,
} from "~web/handlers/receipt-item-consumers/add";
import type { ItemOutput } from "~web/handlers/receipt-items/add";
import {
	addItemSchema,
	batchFn as addItems,
} from "~web/handlers/receipt-items/add";
import type { ParticipantOutput } from "~web/handlers/receipt-participants/add";
import {
	addParticipantSchema,
	batchFn as addParticipants,
} from "~web/handlers/receipt-participants/add";
import { authProcedure } from "~web/handlers/trpc";
import { currencyCodeSchema } from "~web/handlers/validation";

export const addReceiptSchema = z.strictObject({
	name: receiptNameSchema,
	currencyCode: currencyCodeSchema,
	participants: z
		.array(addParticipantSchema.omit({ receiptId: true }))
		.optional(),
	items: z
		.array(
			addItemSchema.omit({ receiptId: true }).extend({
				consumers: addItemConsumerSchema
					.omit({ itemId: true })
					.array()
					.optional(),
			}),
		)
		.optional(),
	issued: z.date(),
});

type InsertedParticipants = {
	errors: TRPCError[];
	participants: ParticipantOutput[];
};
const insertParticipants = async (
	ctx: AuthorizedContext,
	input: z.infer<typeof addReceiptSchema>,
	receiptId: ReceiptsId,
): Promise<InsertedParticipants> => {
	if (!input.participants || input.participants.length === 0) {
		return { errors: [], participants: [] };
	}
	const insertedParticipants = await addParticipants(ctx)(
		input.participants.map((participant) => ({
			receiptId,
			...participant,
		})),
	);
	return insertedParticipants.reduce<InsertedParticipants>(
		(acc, insertedParticipant) => {
			if (insertedParticipant instanceof TRPCError) {
				acc.errors.push(insertedParticipant);
			} else {
				acc.participants.push(insertedParticipant);
			}
			return acc;
		},
		{ errors: [], participants: [] },
	);
};

type InsertedItems = {
	errors: TRPCError[];
	items: ItemOutput[];
};
const insertItems = async (
	ctx: AuthorizedContext,
	input: z.infer<typeof addReceiptSchema>,
	receiptId: ReceiptsId,
): Promise<InsertedItems> => {
	if (!input.items || input.items.length === 0) {
		return { errors: [], items: [] };
	}
	const insertedItems = await addItems(ctx)(
		input.items.map((item) => ({
			receiptId,
			...item,
		})),
	);
	return insertedItems.reduce<InsertedItems>(
		(acc, insertedItem) => {
			/* c8 ignore start */
			if (insertedItem instanceof TRPCError) {
				acc.errors.push(insertedItem);
				/* c8 ignore stop */
			} else {
				acc.items.push(insertedItem);
			}
			return acc;
		},
		{ errors: [], items: [] },
	);
};

type InsertedConsumers = Record<
	ReceiptItemsId,
	{
		errors: TRPCError[];
		consumers: Omit<z.infer<typeof addItemConsumerSchema>, "itemId">[];
	}
>;
const insertConsumers = async (
	ctx: AuthorizedContext,
	input: z.infer<typeof addReceiptSchema>,
	insertedItems: Awaited<ReturnType<typeof insertItems>>,
): Promise<InsertedConsumers> => {
	if (!input.items || input.items.length === 0) {
		return {};
	}
	const consumers = input.items.flatMap((item, index) =>
		(item.consumers ?? []).map((consumer) => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const itemId = insertedItems.items[index]!.id;
			/* c8 ignore start */
			if (!itemId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Expected to have an inserted item for user "${consumer.userId}" with part ${consumer.part}.`,
				});
			}
			/* c8 ignore stop */
			return { itemId, ...consumer };
		}),
	);
	if (consumers.length === 0) {
		return {};
	}
	const insertedConsumers = await addConsumers(ctx)(consumers);
	return consumers.reduce<InsertedConsumers>(
		(acc, { itemId, ...consumer }, index) => {
			const itemAcc = acc[itemId] || { errors: [], consumers: [] };
			const insertedConsumer = insertedConsumers[index];
			if (insertedConsumer instanceof TRPCError) {
				itemAcc.errors.push(insertedConsumer);
			} else {
				itemAcc.consumers.push(consumer);
			}
			if (!acc[itemId]) {
				acc[itemId] = itemAcc;
			}
			return acc;
		},
		{},
	);
};

export const procedure = authProcedure
	.input(addReceiptSchema)
	.mutation(async ({ input, ctx }) => {
		const receiptId: ReceiptsId = ctx.getUuid();
		const receipt = {
			id: receiptId,
			name: input.name,
			currencyCode: input.currencyCode,
			issued: input.issued,
			ownerAccountId: ctx.auth.accountId,
		};
		return ctx.database.transaction().execute(async (tx) => {
			const transactionCtx = { ...ctx, database: tx };
			const result = await tx
				.insertInto("receipts")
				.values(receipt)
				.returning(["receipts.id", "receipts.createdAt"])
				.executeTakeFirstOrThrow();
			const [addedParticipants, addedItems] = await Promise.all([
				insertParticipants(transactionCtx, input, receiptId),
				insertItems(transactionCtx, input, receiptId),
			]);
			if (addedParticipants.errors.length !== 0) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const firstError = addedParticipants.errors[0]!;
				throw new TRPCError({
					code: firstError.code,
					message: `${firstError.message}${
						addedParticipants.errors.length !== 1
							? ` (+${addedParticipants.errors.length - 1} errors)`
							: ""
					}`,
				});
			}
			/* c8 ignore start */
			// There is no way for this to happen at the moment
			if (addedItems.errors.length !== 0) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const firstError = addedItems.errors[0]!;
				throw new TRPCError({
					code: firstError.code,
					message: `${firstError.message}${
						addedItems.errors.length !== 1
							? ` (+${addedItems.errors.length - 1} errors)`
							: ""
					}`,
				});
			}
			const addedConsumers = await insertConsumers(
				transactionCtx,
				input,
				addedItems,
			);
			/* c8 ignore start */
			const addedConsumersErrors = values(addedConsumers).reduce<TRPCError[]>(
				(acc, { errors }) => [...acc, ...errors],
				[],
			);
			if (addedConsumersErrors.length !== 0) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const firstError = addedConsumersErrors[0]!;
				throw new TRPCError({
					code: firstError.code,
					message: `${firstError.message}${
						addedConsumersErrors.length !== 1
							? ` (+${addedConsumersErrors.length - 1} errors)`
							: ""
					}`,
				});
			}
			return {
				id: receipt.id,
				createdAt: result.createdAt,
				participants: addedParticipants.participants,
				items: addedItems.items.map((item) => ({
					id: item.id,
					createdAt: item.createdAt,
				})),
			};
		});
	});
