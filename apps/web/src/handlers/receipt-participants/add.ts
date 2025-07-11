import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { Temporal } from "~utils/date";
import type { BatchLoadContextFn } from "~web/handlers/batch";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import {
	assignableRoleSchema,
	receiptIdSchema,
	userIdSchema,
} from "~web/handlers/validation";
import { getDuplicates } from "~web/utils/batch";

export const addParticipantSchema = z.strictObject({
	receiptId: receiptIdSchema,
	userId: userIdSchema,
	role: assignableRoleSchema,
});

export type ParticipantOutput = {
	createdAt: Temporal.ZonedDateTime;
};

const getData = async (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addParticipantSchema>[],
) => {
	const receiptIds = inputs.map((input) => input.receiptId);
	const [receipts, users] = await Promise.all([
		ctx.database
			.selectFrom("receipts")
			.where("id", "in", receiptIds)
			.select(["receipts.id", "receipts.ownerAccountId"])
			.execute(),
		ctx.database
			.selectFrom("users")
			.where(
				"id",
				"in",
				inputs.map((input) => input.userId),
			)
			.leftJoin("receiptParticipants", (qb) =>
				qb
					.onRef("receiptParticipants.userId", "=", "users.id")
					.on("receiptParticipants.receiptId", "in", receiptIds),
			)
			.select([
				"users.id",
				"users.ownerAccountId",
				"receiptParticipants.receiptId",
			])
			.execute(),
	]);
	return { receipts, users };
};

const getParticipants = (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addParticipantSchema>[],
	{ receipts, users }: Awaited<ReturnType<typeof getData>>,
) =>
	inputs.map((input) => {
		const matchedReceipt = receipts.find(
			(receipt) => receipt.id === input.receiptId,
		);
		if (!matchedReceipt) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist.`,
			});
		}
		if (matchedReceipt.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add participant "${input.userId}" to receipt "${input.receiptId}".`,
			});
		}
		const matchedUsers = users.filter((user) => user.id === input.userId);
		if (
			matchedUsers.length === 0 ||
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			matchedUsers[0]!.ownerAccountId !== ctx.auth.accountId
		) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist or is not owned by you.`,
			});
		}
		const matchedUserReceipt = matchedUsers.find(
			(user) => user.receiptId === input.receiptId,
		);
		if (matchedUserReceipt) {
			return new TRPCError({
				code: "CONFLICT",
				message: `User "${input.userId}" already participates in receipt "${input.receiptId}".`,
			});
		}

		return {
			receiptId: input.receiptId,
			userId: input.userId,
			role:
				matchedReceipt.ownerAccountId === input.userId ? "owner" : input.role,
		};
	});

const insertParticipants = async (
	ctx: AuthorizedContext,
	participants: Exclude<
		ReturnType<typeof getParticipants>[number],
		TRPCError
	>[],
) => {
	if (participants.length === 0) {
		return [];
	}
	return ctx.database
		.insertInto("receiptParticipants")
		.values(participants)
		.returning([
			"receiptParticipants.createdAt",
			"receiptParticipants.userId",
			"receiptParticipants.receiptId",
		])
		.execute();
};

export const batchFn: BatchLoadContextFn<
	AuthorizedContext,
	z.infer<typeof addParticipantSchema>,
	ParticipantOutput,
	TRPCError
> = (ctx) => async (inputs) => {
	const duplicatedTuples = getDuplicates(
		inputs,
		({ receiptId, userId }) => [receiptId, userId] as const,
	);
	if (duplicatedTuples.length !== 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Expected to have unique pair of user id and receipt id, got repeating pairs: ${duplicatedTuples
				.map(
					([[itemId, userId], count]) =>
						`receipt "${itemId}" / user "${userId}" (${count} times)`,
				)
				.join(", ")}.`,
		});
	}
	const data = await getData(ctx, inputs);
	const participantsOrErrors = getParticipants(ctx, inputs, data);
	const results = await insertParticipants(
		ctx,
		participantsOrErrors.filter(
			(
				participantOrError,
			): participantOrError is Exclude<typeof participantOrError, TRPCError> =>
				!(participantOrError instanceof TRPCError),
		),
	);
	return participantsOrErrors.map((participantOrError) => {
		if (participantOrError instanceof TRPCError) {
			return participantOrError;
		}
		const matchedResult = results.find(
			(result) =>
				result.receiptId === participantOrError.receiptId &&
				result.userId === participantOrError.userId,
		);
		/* c8 ignore start */
		if (!matchedResult) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have inserted user "${participantOrError.userId}" in receipt "${participantOrError.receiptId}".`,
			});
		}
		/* c8 ignore stop */
		return {
			createdAt: matchedResult.createdAt,
		};
	});
};

export const procedure = authProcedure
	.input(addParticipantSchema)
	.mutation(queueCallFactory(batchFn));
