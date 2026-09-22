import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { BatchLoadContextFn } from "~web/handlers/batch";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import {
	assignableRoleSchema,
	peerIdSchema,
	receiptIdSchema,
} from "~web/handlers/validation";
import { getDuplicates } from "~web/utils/batch";

export const addParticipantSchema = z.strictObject({
	receiptId: receiptIdSchema,
	peerId: peerIdSchema,
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
	const [receipts, peers] = await Promise.all([
		ctx.database
			.selectFrom("receipts")
			.where("id", "in", receiptIds)
			.select(["receipts.id", "receipts.ownerAccountId"])
			.execute(),
		ctx.database
			.selectFrom("peers")
			.where(
				"id",
				"in",
				inputs.map((input) => input.peerId),
			)
			.leftJoin("receiptParticipants", (qb) =>
				qb
					.onRef("receiptParticipants.peerId", "=", "peers.id")
					.on("receiptParticipants.receiptId", "in", receiptIds),
			)
			.select([
				"peers.id",
				"peers.ownerAccountId",
				"receiptParticipants.receiptId",
			])
			.execute(),
	]);
	return { receipts, peers };
};

const getParticipants = (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addParticipantSchema>[],
	{ receipts, peers }: Awaited<ReturnType<typeof getData>>,
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
				message: `Not enough rights to add participant "${input.peerId}" to receipt "${input.receiptId}".`,
			});
		}
		const matchedPeers = peers.filter((peer) => peer.id === input.peerId);
		const [firstMatchedPeer] = matchedPeers;
		if (
			!firstMatchedPeer ||
			firstMatchedPeer.ownerAccountId !== ctx.auth.accountId
		) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${input.peerId}" does not exist or is not owned by you.`,
			});
		}
		const matchedPeerReceipt = matchedPeers.find(
			(peer) => peer.receiptId === input.receiptId,
		);
		if (matchedPeerReceipt) {
			return new TRPCError({
				code: "CONFLICT",
				message: `Peer "${input.peerId}" already participates in receipt "${input.receiptId}".`,
			});
		}

		return {
			receiptId: input.receiptId,
			peerId: input.peerId,
			role:
				matchedReceipt.ownerAccountId === input.peerId
					? ("owner" as const)
					: input.role,
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
			"receiptParticipants.peerId",
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
		({ receiptId, peerId }) => [receiptId, peerId] as const,
	);
	if (duplicatedTuples.length !== 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Expected to have unique pair of peer id and receipt id, got repeating pairs: ${duplicatedTuples
				.map(
					([[itemId, peerId], count]) =>
						`receipt "${itemId}" / peer "${peerId}" (${count} times)`,
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
				result.peerId === participantOrError.peerId,
		);
		/* c8 ignore start */
		if (!matchedResult) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have inserted peer "${participantOrError.peerId}" in receipt "${participantOrError.receiptId}".`,
			});
		}
		/* c8 ignore stop */
		return {
			createdAt: matchedResult.createdAt,
		};
	});
};

export const procedure = authProcedure
	.meta({
		title: "Add receipt participant",
		description:
			"Adds a given peerId as a participant of a given receipt with an assigned role.",
	})
	.input(addParticipantSchema)
	.mutation(queueCallFactory(batchFn));
