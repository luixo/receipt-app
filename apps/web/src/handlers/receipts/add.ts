import { TRPCError } from "@trpc/server";
import { values } from "remeda";
import { z } from "zod";

import { receiptNameSchema } from "~app/utils/validation";
import type { ReceiptItemsId, ReceiptsId } from "~db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import {
	addPartSchema,
	batchFn as addParts,
} from "~web/handlers/item-participants/add";
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
				parts: addPartSchema.omit({ itemId: true }).array().optional(),
			}),
		)
		.optional(),
	issued: z.date(),
});

type ReceiptOutput = {
	id: ReceiptsId;
	participants: Exclude<
		Awaited<ReturnType<ReturnType<typeof addParticipants>>>[number],
		TRPCError
	>[];
	items: Exclude<
		Awaited<ReturnType<ReturnType<typeof addItems>>>[number],
		TRPCError
	>[];
};

const getReceipts = (
	ctx: AuthorizedContext,
	receipts: readonly z.infer<typeof addReceiptSchema>[],
) =>
	receipts.map((receipt) => {
		const id: ReceiptsId = ctx.getUuid();
		return {
			id,
			name: receipt.name,
			currencyCode: receipt.currencyCode,
			issued: receipt.issued,
			ownerAccountId: ctx.auth.accountId,
		};
	});

const insertParticipants = async (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addReceiptSchema>[],
	receipts: ReturnType<typeof getReceipts>,
) => {
	const participants = inputs.flatMap((element, index) =>
		(element.participants ?? []).map((participant) => ({
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			receiptId: receipts[index]!.id,
			...participant,
		})),
	);
	if (participants.length === 0) {
		return {};
	}
	const insertedParticipants = await addParticipants(ctx)(participants);
	return participants.reduce<
		Record<
			ReceiptsId,
			{ errors: TRPCError[]; participants: ParticipantOutput[] }
		>
	>((acc, { receiptId }, index) => {
		const receiptAcc = acc[receiptId] || { errors: [], participants: [] };
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const insertedParticipant = insertedParticipants[index]!;
		if (insertedParticipant instanceof TRPCError) {
			receiptAcc.errors.push(insertedParticipant);
		} else {
			receiptAcc.participants.push(insertedParticipant);
		}
		if (!acc[receiptId]) {
			acc[receiptId] = receiptAcc;
		}
		return acc;
	}, {});
};

const insertItems = async (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addReceiptSchema>[],
	receipts: ReturnType<typeof getReceipts>,
) => {
	const items = inputs.flatMap((element, index) =>
		(element.items ?? []).map((item) => ({
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			receiptId: receipts[index]!.id,
			...item,
		})),
	);
	if (items.length === 0) {
		return {};
	}
	const insertedItems = await addItems(ctx)(items);
	return items.reduce<
		Record<
			ReceiptsId,
			{
				errors: TRPCError[];
				items: (ItemOutput & Omit<(typeof items)[number], "receiptId">)[];
			}
		>
	>((acc, { receiptId, ...item }, index) => {
		const receiptAcc = acc[receiptId] || { errors: [], items: [] };
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const insertedItem = insertedItems[index]!;
		/* c8 ignore start */
		if (insertedItem instanceof TRPCError) {
			receiptAcc.errors.push(insertedItem);
			/* c8 ignore stop */
		} else {
			receiptAcc.items.push({ ...item, ...insertedItem });
		}
		if (!acc[receiptId]) {
			acc[receiptId] = receiptAcc;
		}
		return acc;
	}, {});
};

const insertParts = async (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addReceiptSchema>[],
	receipts: ReturnType<typeof getReceipts>,
	insertedItems: Awaited<ReturnType<typeof insertItems>>,
) => {
	const parts = inputs.flatMap((element, index) =>
		(element.items ?? []).flatMap((item) =>
			(item.parts ?? []).map((part) => {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const receiptId = receipts[index]!.id;
				const itemId = insertedItems[receiptId]?.items.find(
					(insertedItem) => insertedItem.parts === item.parts,
				)?.id;
				/* c8 ignore start */
				if (!itemId) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Expected to have an inserted item for user "${part.userId}" with part ${part.part}.`,
					});
				}
				/* c8 ignore stop */
				return { receiptId, itemId, ...part };
			}),
		),
	);
	if (parts.length === 0) {
		return {};
	}
	const insertedParts = await addParts(ctx)(parts);
	return parts.reduce<
		Record<
			ReceiptsId,
			Record<
				ReceiptItemsId,
				{
					errors: TRPCError[];
					parts: Omit<z.infer<typeof addPartSchema>, "itemId">[];
				}
			>
		>
	>((acc, { receiptId, itemId, ...part }, index) => {
		const receiptAcc = acc[receiptId] || {};
		const receiptItemAcc = receiptAcc[itemId] || { errors: [], parts: [] };
		const insertedPart = insertedParts[index];
		if (insertedPart instanceof TRPCError) {
			receiptItemAcc.errors.push(insertedPart);
		} else {
			receiptItemAcc.parts.push(part);
		}
		if (!receiptAcc[itemId]) {
			receiptAcc[itemId] = receiptItemAcc;
		}
		if (!acc[receiptId]) {
			acc[receiptId] = receiptAcc;
		}
		return acc;
	}, {});
};

const queueAddReceipt = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof addReceiptSchema>,
	ReceiptOutput
>((ctx) => async (inputs) => {
	const receipts = getReceipts(ctx, inputs);
	const results = await ctx.database
		.insertInto("receipts")
		.values(receipts)
		.returning(["receipts.id", "receipts.createdAt"])
		.execute();
	const [addedParticipants, addedItems] = await Promise.all([
		insertParticipants(ctx, inputs, receipts),
		insertItems(ctx, inputs, receipts),
	]);
	const addedParts = await insertParts(ctx, inputs, receipts, addedItems);
	return receipts.map((receipt) => {
		const matchedResult = results.find((result) => result.id === receipt.id);
		/* c8 ignore start */
		if (!matchedResult) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have a matched receipt in list of inserted rows for id "${receipt.id}".`,
			});
		}
		/* c8 ignore stop */
		const matchedParticipants = addedParticipants[receipt.id] ?? {
			errors: [],
			participants: [],
		};
		if (matchedParticipants.errors.length !== 0) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const firstError = matchedParticipants.errors[0]!;
			return new TRPCError({
				code: firstError.code,
				message: `${firstError.message}${
					matchedParticipants.errors.length !== 1
						? ` (+${matchedParticipants.errors.length - 1} errors)`
						: ""
				}`,
			});
		}
		const matchedItems = addedItems[receipt.id] ?? {
			errors: [],
			items: [],
		};
		/* c8 ignore start */
		// There is no way for this to happen at the moment
		if (matchedItems.errors.length !== 0) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const firstError = matchedItems.errors[0]!;
			return new TRPCError({
				code: firstError.code,
				message: `${firstError.message}${
					matchedItems.errors.length !== 1
						? ` (+${matchedItems.errors.length - 1} errors)`
						: ""
				}`,
			});
		}
		/* c8 ignore start */
		const matchedParts = addedParts[receipt.id] ?? {};
		const matchedPartsErrors = values(matchedParts).reduce<TRPCError[]>(
			(acc, { errors }) => [...acc, ...errors],
			[],
		);
		if (matchedPartsErrors.length !== 0) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const firstError = matchedPartsErrors[0]!;
			return new TRPCError({
				code: firstError.code,
				message: `${firstError.message}${
					matchedPartsErrors.length !== 1
						? ` (+${matchedPartsErrors.length - 1} errors)`
						: ""
				}`,
			});
		}
		return {
			id: receipt.id,
			participants: matchedParticipants.participants,
			items: matchedItems.items.map((item) => ({
				id: item.id,
				createdAt: item.createdAt,
			})),
		};
	});
});

export const procedure = authProcedure
	.input(addReceiptSchema)
	.mutation(queueAddReceipt);
