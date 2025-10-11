import { TRPCError } from "@trpc/server";
import { unique } from "remeda";
import { z } from "zod";

import { partSchema } from "~app/utils/validation";
import type { Temporal } from "~utils/date";
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

export type PayerOutput = { createdAt: Temporal.ZonedDateTime };

export const addItemPayerSchema = z.strictObject({
	itemId: receiptItemIdSchema,
	userId: userIdSchema,
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
						inputs.map(({ itemId, userId }) =>
							eb.and({
								"receiptItemPayers.itemId": itemId,
								"receiptItemPayers.userId": userId,
							}),
						),
					),
				)
				.select([
					"receiptItemPayers.part",
					"receiptItemPayers.userId",
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
		if (matchedReceiptItems.length === 0) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${input.itemId}" does not exist.`,
			});
		}
		// We just checked for non-empty array
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const { receiptId, ownerAccountId } = matchedReceiptItems[0]!;
		if (ownerAccountId !== ctx.auth.accountId) {
			const selfReceiptItemRole = matchedReceiptItems.find(
				(receiptItem) => receiptItem.selfAccountId === ctx.auth.accountId,
			)?.role;
			const parsed = roleSchema.safeParse(selfReceiptItemRole);
			if (!parsed.success) {
				return new TRPCError({
					code: "PRECONDITION_FAILED",
					message: `User "${input.userId}" doesn't participate in receipt "${receiptId}".`,
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
			({ userId, itemId }) =>
				userId === input.userId && itemId === input.itemId,
		);
		if (matchedReceiptItemPayer) {
			return new TRPCError({
				code: "CONFLICT",
				message: `User "${input.userId}" already pays for item "${input.itemId}".`,
			});
		}
		const matchedUser = receiptParticipants.find(
			(receiptParticipant) => receiptParticipant.userId === input.userId,
		);
		if (!matchedUser) {
			return new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `User "${input.userId}" doesn't participate in receipt "${receiptId}".`,
			});
		}
		return {
			userId: input.userId,
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
			"receiptItemPayers.userId",
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
				payer.userId === itemOrError.userId,
		);
		/* c8 ignore start */
		if (!matchedPayer) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have a matched item payer in list of inserted rows for item id "${itemOrError.itemId}" and user id "${itemOrError.userId}".`,
			});
		}
		/* c8 ignore stop */
		return { createdAt: matchedPayer.createdAt };
	});
};

export const procedure = authProcedure
	.input(addItemPayerSchema)
	.mutation(queueCallFactory(batchFn));
