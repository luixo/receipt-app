import { TRPCError } from "@trpc/server";
import { omit, values } from "remeda";
import { z } from "zod/v4";

import { receiptNameSchema } from "~app/utils/validation";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "~db/models";
import type { AuthorizedContext } from "~web/handlers/context";
import type { ConsumerOutput } from "~web/handlers/receipt-item-consumers/add";
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
	payers: z.array(addItemConsumerSchema.omit({ itemId: true })).optional(),
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
	const receiptIdAsItemId = receiptId as ReceiptItemsId;
	const [insertedItems, insertPayerItem] = await Promise.all([
		!input.items || input.items.length === 0
			? []
			: addItems(ctx)(
					input.items.map((item) => ({
						receiptId,
						...item,
					})),
				),
		ctx.database
			.insertInto("receiptItems")
			.values({
				id: receiptIdAsItemId,
				name: "",
				price: "0",
				quantity: "0",
				receiptId,
			})
			.returning(["receiptItems.createdAt"])
			.executeTakeFirstOrThrow(),
	]);
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
		{
			errors: [],
			items: [{ id: receiptIdAsItemId, createdAt: insertPayerItem.createdAt }],
		},
	);
};

type InsertedConsumers = Record<
	ReceiptItemsId,
	{
		errors: TRPCError[];
		consumers: (ConsumerOutput & { userId: UsersId })[];
	}
>;
const insertConsumers = async (
	ctx: AuthorizedContext,
	input: z.infer<typeof addReceiptSchema>,
	receiptId: ReceiptsId,
	insertedItems: Awaited<ReturnType<typeof insertItems>>["items"],
): Promise<InsertedConsumers> => {
	const receiptIdAsItemId = receiptId as ReceiptItemsId;
	const consumers = [
		...(input.items?.flatMap((item, index) =>
			(item.consumers ?? []).map((consumer) => {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const itemId = insertedItems[index]!.id;
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
		) ?? []),
		...(input.payers?.map((payer) => ({
			itemId: receiptIdAsItemId,
			...payer,
		})) ?? []),
	];
	if (consumers.length === 0) {
		return {};
	}
	const insertedConsumers = await addConsumers(ctx)(consumers);
	return insertedConsumers.reduce<InsertedConsumers>(
		(acc, insertedConsumer, index) => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const { itemId, userId } = consumers[index]!;
			const itemAcc = acc[itemId] || { errors: [], consumers: [] };
			if (insertedConsumer instanceof TRPCError) {
				itemAcc.errors.push(insertedConsumer);
			} else {
				itemAcc.consumers.push({
					userId,
					createdAt: insertedConsumer.createdAt,
				});
			}
			if (!acc[itemId]) {
				acc[itemId] = itemAcc;
			}
			return acc;
		},
		{},
	);
};

const verifyParticipants = (
	input: z.infer<typeof addReceiptSchema>,
	participants: Awaited<ReturnType<typeof insertParticipants>>,
) => {
	const firstError = participants.errors[0];
	if (firstError) {
		throw new TRPCError({
			code: firstError.code,
			message: `${firstError.message}${
				participants.errors.length !== 1
					? ` (+${participants.errors.length - 1} errors)`
					: ""
			}`,
		});
	}
	const actualAddedParticipants = participants.participants.length;
	const expectedAddedParticipants = input.participants?.length ?? 0;
	/* c8 ignore start */
	if (actualAddedParticipants !== expectedAddedParticipants) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Expected to add ${expectedAddedParticipants} participants, added ${actualAddedParticipants}.`,
		});
	}
	/* c8 ignore stop */
};

const verifyItems = (
	input: z.infer<typeof addReceiptSchema>,
	items: Awaited<ReturnType<typeof insertItems>>,
) => {
	// There is no way for this to happen at the moment
	/* c8 ignore start */
	const firstError = items.errors[0];
	if (firstError) {
		throw new TRPCError({
			code: firstError.code,
			message: `${firstError.message}${
				items.errors.length !== 1 ? ` (+${items.errors.length - 1} errors)` : ""
			}`,
		});
	}
	/* c8 ignore stop */

	// Removing payers item
	const actualAddedItems = items.items.length;
	const expectedAddedItems = input.items?.length ?? 0;
	/* c8 ignore start */
	if (actualAddedItems !== expectedAddedItems) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Expected to add ${expectedAddedItems} items, added ${actualAddedItems}.`,
		});
	}
	/* c8 ignore stop */
};

const verifyPayers = (
	input: z.infer<typeof addReceiptSchema>,
	receiptId: ReceiptsId,
	payers: Awaited<ReturnType<typeof insertConsumers>>[string] = {
		errors: [],
		consumers: [],
	},
) => {
	const firstError = payers.errors[0];
	if (firstError) {
		throw new TRPCError({
			code: firstError.code,
			message: `${firstError.message.replace(receiptId, "new receipt")}${
				payers.errors.length !== 1
					? /* c8 ignore start */
						` (+${payers.errors.length - 1} errors)`
					: ""
				/* c8 ignore stop */
			}`,
		});
	}
	const actualAddedPayers = payers.consumers.length;
	const expectedAddedPayers = input.payers?.length ?? 0;
	/* c8 ignore start */
	if (actualAddedPayers !== expectedAddedPayers) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Expected to add ${expectedAddedPayers} payers, added ${actualAddedPayers}.`,
		});
	}
	/* c8 ignore stop */
};

const verifyConsumers = (
	input: z.infer<typeof addReceiptSchema>,
	consumers: Awaited<ReturnType<typeof insertConsumers>>,
) => {
	const addedConsumersErrors = values(consumers).reduce<TRPCError[]>(
		(acc, { errors }) => [...acc, ...errors],
		[],
	);
	/* c8 ignore start */
	const firstError = addedConsumersErrors[0];
	if (firstError) {
		throw new TRPCError({
			code: firstError.code,
			message: `${firstError.message}${
				addedConsumersErrors.length !== 1
					? ` (+${addedConsumersErrors.length - 1} errors)`
					: ""
			}`,
		});
	}
	/* c8 ignore stop */
	const actualAddedConsumers = values(consumers).reduce(
		(acc, { consumers: localConsumers }) => acc + localConsumers.length,
		0,
	);
	const expectedAddedConsumers =
		input.items?.reduce(
			(acc, item) => acc + (item.consumers?.length ?? 0),
			0,
		) ?? 0;
	/* c8 ignore start */
	if (actualAddedConsumers !== expectedAddedConsumers) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Expected to add ${expectedAddedConsumers} consumers, added ${actualAddedConsumers}.`,
		});
	}
	/* c8 ignore stop */
};

export const procedure = authProcedure
	.input(addReceiptSchema)
	.mutation(async ({ input, ctx }) => {
		const receiptId: ReceiptsId = ctx.getUuid();
		return ctx.database.transaction().execute(async (tx) => {
			const transactionCtx = { ...ctx, database: tx };
			const result = await tx
				.insertInto("receipts")
				.values({
					id: receiptId,
					name: input.name,
					currencyCode: input.currencyCode,
					issued: input.issued,
					ownerAccountId: ctx.auth.accountId,
				})
				.returning(["receipts.id", "receipts.createdAt"])
				.executeTakeFirstOrThrow();
			const [addedParticipants, addedItems] = await Promise.all([
				insertParticipants(transactionCtx, input, receiptId),
				insertItems(transactionCtx, input, receiptId),
			]);
			verifyParticipants(input, addedParticipants);
			const regularItems = addedItems.items.filter(
				(item) => item.id !== receiptId,
			);
			verifyItems(input, { ...addedItems, items: regularItems });
			const addedConsumers = await insertConsumers(
				transactionCtx,
				input,
				receiptId,
				regularItems,
			);
			const receiptIdAsItemId = receiptId as ReceiptItemsId;
			const payersConsumers = addedConsumers[receiptIdAsItemId];
			const regularConsumers = omit(addedConsumers, [
				receiptIdAsItemId,
			]) as typeof addedConsumers;
			verifyPayers(input, receiptId, payersConsumers);
			verifyConsumers(input, regularConsumers);
			return {
				id: receiptId,
				createdAt: result.createdAt,
				participants: addedParticipants.participants,
				items: regularItems.map((item) => {
					const itemConsumers = regularConsumers[item.id]?.consumers;
					return {
						id: item.id,
						createdAt: item.createdAt,
						consumers:
							!itemConsumers || itemConsumers.length === 0
								? undefined
								: itemConsumers,
					};
				}),
				payers: payersConsumers?.consumers ?? [],
			};
		});
	});
