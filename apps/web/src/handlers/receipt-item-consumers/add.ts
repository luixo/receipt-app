import { TRPCError } from "@trpc/server";
import { unique } from "remeda";
import { z } from "zod";

import { partSchema } from "~app/utils/validation";
import type { BatchLoadContextFn } from "~web/handlers/batch";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import {
	receiptItemIdSchema,
	roleSchema,
	userIdSchema,
} from "~web/handlers/validation";
import { getDuplicates } from "~web/utils/batch";

export type ConsumerOutput = { createdAt: Date };

export const addItemConsumerSchema = z.strictObject({
	itemId: receiptItemIdSchema,
	userId: userIdSchema,
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
					"receiptParticipants.userId",
					"in",
					unique(inputs.map((input) => input.userId)),
				)
				.innerJoin("receipts", (qb) =>
					qb.onRef("receipts.id", "=", "receiptParticipants.receiptId"),
				)
				.select(["receiptParticipants.userId"])
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
				.leftJoin("users", (jb) =>
					jb.onRef("users.id", "=", "receiptParticipants.userId"),
				)
				.leftJoin("accounts", (jb) =>
					jb
						.onRef("accounts.id", "=", "users.connectedAccountId")
						.on("accounts.id", "=", ctx.auth.accountId),
				)
				.groupBy([
					"receipts.ownerAccountId",
					"receipts.id",
					"receiptParticipants.role",
					"receiptItems.id",
				])
				.select([
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
						inputs.map(({ itemId, userId }) =>
							eb.and({
								"receiptItemConsumers.itemId": itemId,
								"receiptItemConsumers.userId": userId,
							}),
						),
					),
				)
				.select([
					"receiptItemConsumers.part",
					"receiptItemConsumers.userId",
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
		const matchedReceiptItem = receiptItems.find(
			(receiptItem) => receiptItem.itemId === input.itemId,
		);
		if (!matchedReceiptItem) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${input.itemId}" does not exist.`,
			});
		}
		if (matchedReceiptItem.ownerAccountId !== ctx.auth.accountId) {
			const parsed = roleSchema.safeParse(matchedReceiptItem.role);
			if (!parsed.success) {
				return new TRPCError({
					code: "PRECONDITION_FAILED",
					message: `User "${input.userId}" doesn't participate in receipt "${matchedReceiptItem.receiptId}".`,
				});
			}
			const accessRole = parsed.data;
			if (accessRole !== "owner" && accessRole !== "editor") {
				return new TRPCError({
					code: "FORBIDDEN",
					message: `Not enough rights to add item to receipt "${matchedReceiptItem.receiptId}".`,
				});
			}
		}
		const matchedReceiptItemConsumer = receiptItemConsumers.find(
			({ userId, itemId }) =>
				userId === input.userId && itemId === input.itemId,
		);
		if (matchedReceiptItemConsumer) {
			return new TRPCError({
				code: "CONFLICT",
				message: `User "${input.userId}" already consumes item "${matchedReceiptItem.itemId}".`,
			});
		}
		const matchedUser = receiptParticipants.find(
			(receiptParticipant) => receiptParticipant.userId === input.userId,
		);
		if (!matchedUser) {
			return new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `User "${input.userId}" doesn't participate in receipt "${matchedReceiptItem.receiptId}".`,
			});
		}
		return {
			userId: input.userId,
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
			"receiptItemConsumers.userId",
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
		({ itemId, userId }) => [itemId, userId] as const,
	);
	if (duplicatedTuples.length !== 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Expected to have unique pair of item id and user id, got repeating pairs: ${duplicatedTuples
				.map(
					([[itemId, userId], count]) =>
						`item "${itemId}" / user "${userId}" (${count} times)`,
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
				consumer.userId === itemOrError.userId,
		);
		/* c8 ignore start */
		if (!matchedConsumer) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have a matched item consumer in list of inserted rows for item id "${itemOrError.itemId}" and user id "${itemOrError.userId}".`,
			});
		}
		/* c8 ignore stop */
		return { createdAt: matchedConsumer.createdAt };
	});
};

export const procedure = authProcedure
	.input(addItemConsumerSchema)
	.mutation(queueCallFactory(batchFn));
