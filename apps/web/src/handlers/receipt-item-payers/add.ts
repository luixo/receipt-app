import { TRPCError } from "@trpc/server";
import { unique } from "remeda";
import { z } from "zod";

import { partSchema } from "~app/utils/validation";
import type { BatchLoadContextFn } from "~web/handlers/batch";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import {
	peerIdSchema,
	receiptItemIdSchema,
	roleSchema,
} from "~web/handlers/validation";
import { getDuplicates } from "~web/utils/batch";

export type PayerOutput = { createdAt: Temporal.ZonedDateTime };

export const addItemPayerSchema = z.strictObject({
	itemId: receiptItemIdSchema,
	peerId: peerIdSchema,
	part: partSchema,
});

const getData = async (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addItemPayerSchema>[],
) => {
	const [receiptParticipants, receiptItems, receiptItemPayers] =
		await Promise.all([
			ctx.database
				.selectFrom("receiptParticipants")
				.where(
					"receiptParticipants.peerId",
					"in",
					unique(inputs.map((input) => input.peerId)),
				)
				.innerJoin("receipts", (qb) =>
					qb.onRef("receipts.id", "=", "receiptParticipants.receiptId"),
				)
				.select(["receiptParticipants.peerId"])
				.execute(),
			ctx.database
				.selectFrom("receiptItems")
				.where(
					"receiptItems.id",
					"in",
					unique(inputs.map((input) => input.itemId)),
				)
				.innerJoin("receipts", (qb) =>
					qb.onRef("receipts.id", "=", "receiptItems.receiptId"),
				)
				.leftJoin("receiptParticipants", (jb) =>
					jb.onRef("receipts.id", "=", "receiptParticipants.receiptId"),
				)
				.leftJoin("peers", (jb) =>
					jb.onRef("peers.id", "=", "receiptParticipants.peerId"),
				)
				.leftJoin("accounts", (jb) =>
					jb
						.onRef("accounts.id", "=", "peers.connectedAccountId")
						.on("accounts.id", "=", ctx.auth.accountId),
				)
				.groupBy([
					"accounts.id",
					"receipts.ownerAccountId",
					"receipts.id",
					"receiptParticipants.role",
					"receiptItems.id",
				])
				.select([
					"accounts.id as selfAccountId",
					"receipts.ownerAccountId",
					"receipts.id as receiptId",
					"receiptParticipants.role",
					"receiptItems.id as itemId",
				])
				.execute(),
			ctx.database
				.selectFrom("receiptItemPayers")
				.where((eb) =>
					eb.or(
						inputs.map(({ itemId, peerId }) =>
							eb.and({
								"receiptItemPayers.itemId": itemId,
								"receiptItemPayers.peerId": peerId,
							}),
						),
					),
				)
				.select([
					"receiptItemPayers.part",
					"receiptItemPayers.peerId",
					"receiptItemPayers.itemId",
				])
				.execute(),
		]);
	return { receiptParticipants, receiptItems, receiptItemPayers };
};

const getPayersOrErrors = (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addItemPayerSchema>[],
	{
		receiptItems,
		receiptParticipants,
		receiptItemPayers,
	}: Awaited<ReturnType<typeof getData>>,
) =>
	inputs.map((input) => {
		const matchedReceiptItems = receiptItems.filter(
			(receiptItem) => receiptItem.itemId === input.itemId,
		);
		const [firstReceiptItem] = matchedReceiptItems;
		if (!firstReceiptItem) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${input.itemId}" does not exist.`,
			});
		}
		const { receiptId, ownerAccountId } = firstReceiptItem;
		if (ownerAccountId !== ctx.auth.accountId) {
			const selfReceiptItemRole = matchedReceiptItems.find(
				(receiptItem) => receiptItem.selfAccountId === ctx.auth.accountId,
			)?.role;
			const parsed = roleSchema.safeParse(selfReceiptItemRole);
			if (!parsed.success) {
				return new TRPCError({
					code: "PRECONDITION_FAILED",
					message: `Peer "${input.peerId}" doesn't participate in receipt "${receiptId}".`,
				});
			}
			const accessRole = parsed.data;
			if (accessRole !== "owner" && accessRole !== "editor") {
				return new TRPCError({
					code: "FORBIDDEN",
					message: `Not enough rights to add item to receipt "${receiptId}".`,
				});
			}
		}
		const matchedReceiptItemPayer = receiptItemPayers.find(
			({ peerId, itemId }) =>
				peerId === input.peerId && itemId === input.itemId,
		);
		if (matchedReceiptItemPayer) {
			return new TRPCError({
				code: "CONFLICT",
				message: `Peer "${input.peerId}" already pays for item "${input.itemId}".`,
			});
		}
		const matchedPeer = receiptParticipants.find(
			(receiptParticipant) => receiptParticipant.peerId === input.peerId,
		);
		if (!matchedPeer) {
			return new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `Peer "${input.peerId}" doesn't participate in receipt "${receiptId}".`,
			});
		}
		return {
			peerId: input.peerId,
			itemId: input.itemId,
			part: input.part.toString(),
		};
	});

const insertPayers = async (
	ctx: AuthorizedContext,
	payers: Exclude<ReturnType<typeof getPayersOrErrors>[number], TRPCError>[],
) => {
	if (payers.length === 0) {
		return [];
	}
	return ctx.database
		.insertInto("receiptItemPayers")
		.values(payers)
		.returning([
			"receiptItemPayers.createdAt",
			"receiptItemPayers.itemId",
			"receiptItemPayers.peerId",
		])
		.execute();
};

export const batchFn: BatchLoadContextFn<
	AuthorizedContext,
	z.infer<typeof addItemPayerSchema>,
	PayerOutput,
	TRPCError
> = (ctx) => async (inputs) => {
	const duplicatedTuples = getDuplicates(
		inputs,
		({ itemId, peerId }) => [itemId, peerId] as const,
	);
	if (duplicatedTuples.length !== 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Expected to have unique pair of item id and peer id, got repeating pairs: ${duplicatedTuples
				.map(
					([[itemId, peerId], count]) =>
						`item "${itemId}" / peer "${peerId}" (${count} times)`,
				)
				.join(", ")}.`,
		});
	}
	const data = await getData(ctx, inputs);
	const payersOrErrors = getPayersOrErrors(ctx, inputs, data);
	const insertedPayer = await insertPayers(
		ctx,
		payersOrErrors.filter(
			(payerOrError): payerOrError is Exclude<typeof payerOrError, TRPCError> =>
				!(payerOrError instanceof TRPCError),
		),
	);
	return payersOrErrors.map((itemOrError) => {
		if (itemOrError instanceof TRPCError) {
			return itemOrError;
		}
		const matchedPayer = insertedPayer.find(
			(payer) =>
				payer.itemId === itemOrError.itemId &&
				payer.peerId === itemOrError.peerId,
		);
		/* c8 ignore start */
		if (!matchedPayer) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have a matched item payer in list of inserted rows for item id "${itemOrError.itemId}" and peer id "${itemOrError.peerId}".`,
			});
		}
		/* c8 ignore stop */
		return { createdAt: matchedPayer.createdAt };
	});
};

export const procedure = authProcedure
	.meta({
		title: "Add receipt item payer",
		description:
			"Assigns a participating peerId as a payer of a given receipt item with a given part share.",
	})
	.input(addItemPayerSchema)
	.mutation(queueCallFactory(batchFn));
