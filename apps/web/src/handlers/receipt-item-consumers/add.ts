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

export type ConsumerOutput = { createdAt: Temporal.ZonedDateTime };

export const addItemConsumerSchema = z.strictObject({
	itemId: receiptItemIdSchema,
	peerId: peerIdSchema,
	part: partSchema,
});

const getData = async (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addItemConsumerSchema>[],
) => {
	const [receiptParticipants, receiptItems, receiptItemConsumers] =
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
				.selectFrom("receiptItemConsumers")
				.where((eb) =>
					eb.or(
						inputs.map(({ itemId, peerId }) =>
							eb.and({
								"receiptItemConsumers.itemId": itemId,
								"receiptItemConsumers.peerId": peerId,
							}),
						),
					),
				)
				.select([
					"receiptItemConsumers.part",
					"receiptItemConsumers.peerId",
					"receiptItemConsumers.itemId",
				])
				.execute(),
		]);
	return { receiptParticipants, receiptItems, receiptItemConsumers };
};

const getConsumersOrErrors = (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addItemConsumerSchema>[],
	{
		receiptItems,
		receiptParticipants,
		receiptItemConsumers,
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
		const matchedReceiptItemConsumer = receiptItemConsumers.find(
			({ peerId, itemId }) =>
				peerId === input.peerId && itemId === input.itemId,
		);
		if (matchedReceiptItemConsumer) {
			return new TRPCError({
				code: "CONFLICT",
				message: `Peer "${input.peerId}" already consumes item "${input.itemId}".`,
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

const insertConsumers = async (
	ctx: AuthorizedContext,
	consumers: Exclude<
		ReturnType<typeof getConsumersOrErrors>[number],
		TRPCError
	>[],
) => {
	if (consumers.length === 0) {
		return [];
	}
	return ctx.database
		.insertInto("receiptItemConsumers")
		.values(consumers)
		.returning([
			"receiptItemConsumers.createdAt",
			"receiptItemConsumers.itemId",
			"receiptItemConsumers.peerId",
		])
		.execute();
};

export const batchFn: BatchLoadContextFn<
	AuthorizedContext,
	z.infer<typeof addItemConsumerSchema>,
	ConsumerOutput,
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
	const consumersOrErrors = getConsumersOrErrors(ctx, inputs, data);
	const insertedConsumers = await insertConsumers(
		ctx,
		consumersOrErrors.filter(
			(
				consumerOrError,
			): consumerOrError is Exclude<typeof consumerOrError, TRPCError> =>
				!(consumerOrError instanceof TRPCError),
		),
	);
	return consumersOrErrors.map((itemOrError) => {
		if (itemOrError instanceof TRPCError) {
			return itemOrError;
		}
		const matchedConsumer = insertedConsumers.find(
			(consumer) =>
				consumer.itemId === itemOrError.itemId &&
				consumer.peerId === itemOrError.peerId,
		);
		/* c8 ignore start */
		if (!matchedConsumer) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have a matched item consumer in list of inserted rows for item id "${itemOrError.itemId}" and peer id "${itemOrError.peerId}".`,
			});
		}
		/* c8 ignore stop */
		return { createdAt: matchedConsumer.createdAt };
	});
};

export const procedure = authProcedure
	.meta({
		title: "Add receipt item consumer",
		description:
			"Assigns a participating peerId as a consumer of a given receipt item with a given part share.",
	})
	.input(addItemConsumerSchema)
	.mutation(queueCallFactory(batchFn));
