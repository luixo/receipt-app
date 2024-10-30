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

export const addPartSchema = z.strictObject({
	itemId: receiptItemIdSchema,
	userId: userIdSchema,
	part: partSchema,
});

const getData = async (
	ctx: AuthorizedContext,
	participants: readonly z.infer<typeof addPartSchema>[],
) => {
	const [receiptParticipants, receiptItems, itemParts] = await Promise.all([
		ctx.database
			.selectFrom("receiptParticipants")
			.where(
				"receiptParticipants.userId",
				"in",
				unique(participants.map((participant) => participant.userId)),
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
				unique(participants.map((participant) => participant.itemId)),
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
			.selectFrom("itemParticipants")
			.where((eb) =>
				eb.or(
					participants.map(({ itemId, userId }) =>
						eb.and({
							"itemParticipants.itemId": itemId,
							"itemParticipants.userId": userId,
						}),
					),
				),
			)
			.select([
				"itemParticipants.part",
				"itemParticipants.userId",
				"itemParticipants.itemId",
			])
			.execute(),
	]);
	return { receiptParticipants, receiptItems, itemParts };
};

const getParticipantsOrErrors = (
	ctx: AuthorizedContext,
	participants: readonly z.infer<typeof addPartSchema>[],
	{
		receiptItems,
		receiptParticipants,
		itemParts,
	}: Awaited<ReturnType<typeof getData>>,
) =>
	participants.map((participant) => {
		const matchedReceiptItem = receiptItems.find(
			(receiptItem) => receiptItem.itemId === participant.itemId,
		);
		if (!matchedReceiptItem) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${participant.itemId}" does not exist.`,
			});
		}
		if (matchedReceiptItem.ownerAccountId !== ctx.auth.accountId) {
			const parsed = roleSchema.safeParse(matchedReceiptItem.role);
			if (!parsed.success) {
				return new TRPCError({
					code: "PRECONDITION_FAILED",
					message: `User "${participant.userId}" doesn't participate in receipt "${matchedReceiptItem.receiptId}".`,
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
		const matchedPart = itemParts.find(
			({ userId, itemId }) =>
				userId === participant.userId && itemId === participant.itemId,
		);
		if (matchedPart) {
			return new TRPCError({
				code: "CONFLICT",
				message: `User "${participant.userId}" already has a part in item "${matchedReceiptItem.itemId}".`,
			});
		}
		const matchedUser = receiptParticipants.find(
			(receiptParticipant) => receiptParticipant.userId === participant.userId,
		);
		if (!matchedUser) {
			return new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `User "${participant.userId}" doesn't participate in receipt "${matchedReceiptItem.receiptId}".`,
			});
		}
		return {
			userId: participant.userId,
			itemId: participant.itemId,
			part: participant.part.toString(),
		};
	});

const insertParticipants = async (
	ctx: AuthorizedContext,
	participants: Exclude<
		ReturnType<typeof getParticipantsOrErrors>[number],
		TRPCError
	>[],
) => {
	if (participants.length === 0) {
		return;
	}
	await ctx.database
		.insertInto("itemParticipants")
		.values(participants)
		.execute();
};

export const batchFn: BatchLoadContextFn<
	AuthorizedContext,
	z.infer<typeof addPartSchema>,
	void,
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
	const participantsOrErrors = getParticipantsOrErrors(ctx, inputs, data);
	await insertParticipants(
		ctx,
		participantsOrErrors.filter(
			(participant): participant is Exclude<typeof participant, TRPCError> =>
				!(participant instanceof TRPCError),
		),
	);
	return participantsOrErrors.map((itemOrError) => {
		if (itemOrError instanceof TRPCError) {
			return itemOrError;
		}
		return undefined;
	});
};

export const procedure = authProcedure
	.input(addPartSchema)
	.mutation(queueCallFactory(batchFn));
