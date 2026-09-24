import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { UserId } from "~db/ids";
import type { BatchLoadContextFn } from "~web/handlers/batch";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { emailSchema, peerIdSchema } from "~web/handlers/validation";
import { getDuplicates } from "~web/utils/batch";

const addConnectionIntentionSchema = z.strictObject({
	peerId: peerIdSchema,
	email: emailSchema,
});
type ConnectionIntention = z.infer<typeof addConnectionIntentionSchema>;

const getTargetPeers = async (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
) =>
	ctx.database
		.selectFrom("peers")
		.where(
			"peers.id",
			"in",
			intentions.map((intention) => intention.peerId),
		)
		.leftJoin("peers as reciprocalPeers", (qb) =>
			qb
				.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
				.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
		)
		.leftJoin("users", (qb) =>
			qb.onRef("users.id", "=", "peers.connectedUserId"),
		)
		.select([
			"peers.id",
			"peers.name",
			"users.email",
			"peers.ownerUserId",
			"reciprocalPeers.id as reciprocalPeerId",
		])
		.execute();

const getTargetUsers = async (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
) =>
	ctx.database
		.selectFrom("users")
		.where(
			"users.email",
			"in",
			intentions.map((intention) => intention.email.lowercase),
		)
		.leftJoin("peers", (qb) =>
			qb
				.onRef("peers.connectedUserId", "=", "users.id")
				.on("peers.ownerUserId", "=", ctx.auth.userId),
		)
		.leftJoin("peers as reciprocalPeers", (qb) =>
			qb
				.onRef("reciprocalPeers.ownerUserId", "=", "users.id")
				.on("reciprocalPeers.connectedUserId", "=", ctx.auth.userId),
		)
		.select([
			"users.id",
			"users.avatarUrl",
			"users.email",
			"peers.name as peerName",
			"reciprocalPeers.id as reciprocalPeerId",
		])
		.execute();

const getDirectIntentions = async (
	ctx: AuthorizedContext,
	targetUsersPromise: ReturnType<typeof getTargetUsers>,
	targetPeersPromise: ReturnType<typeof getTargetPeers>,
) => {
	const targetUsers = await targetUsersPromise;
	const targetPeers = await targetPeersPromise;
	if (targetUsers.length === 0 || targetPeers.length === 0) {
		return [];
	}
	return ctx.database
		.selectFrom("peers")
		.leftJoin("peers as reciprocalPeers", (qb) =>
			qb
				.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
				.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
		)
		.where("peers.ownerUserId", "=", ctx.auth.userId)
		.where("peers.connectedUserId", "is not", null)
		.where("reciprocalPeers.id", "is", null)
		.where((qb) =>
			qb.or([
				qb(
					"peers.connectedUserId",
					"in",
					targetUsers.map(({ id }) => id),
				),
				qb(
					"peers.id",
					"in",
					targetPeers.map(({ id }) => id),
				),
			]),
		)
		.select([
			"peers.id as peerId",
			"peers.connectedUserId as targetUserId",
			"peers.name",
		])
		.execute();
};

const getViceVersaIntentions = async (
	ctx: AuthorizedContext,
	targetUsersPromise: ReturnType<typeof getTargetUsers>,
) => {
	const targetUsers = await targetUsersPromise;
	if (targetUsers.length === 0) {
		return [];
	}
	return ctx.database
		.selectFrom("peers")
		.leftJoin("peers as reciprocalPeers", (qb) =>
			qb
				.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
				.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
		)
		.where(
			"peers.ownerUserId",
			"in",
			targetUsers.map(({ id }) => id),
		)
		.where("peers.connectedUserId", "=", ctx.auth.userId)
		.where("reciprocalPeers.id", "is", null)
		.select(["peers.id as peerId", "peers.ownerUserId as userId"])
		.execute();
};

const getData = async (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
) => {
	const targetUsersPromise = getTargetUsers(ctx, intentions);
	const targetPeersPromise = getTargetPeers(ctx, intentions);

	return {
		targetUsers: await targetUsersPromise,
		targetPeers: await targetPeersPromise,
		directIntentions: await getDirectIntentions(
			ctx,
			targetUsersPromise,
			targetPeersPromise,
		),
		viceVersaIntentions: await getViceVersaIntentions(ctx, targetUsersPromise),
	};
};

const getIntentionsOrErrors = (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
	{
		targetUsers,
		targetPeers,
		viceVersaIntentions,
		directIntentions,
	}: Awaited<ReturnType<typeof getData>>,
) =>
	intentions.map((intention) => {
		const targetPeer = targetPeers.find((peer) => peer.id === intention.peerId);
		if (!targetPeer) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${intention.peerId}" does not exist.`,
			});
		}
		if (targetPeer.ownerUserId !== ctx.auth.userId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${intention.peerId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (targetPeer.email && targetPeer.reciprocalPeerId) {
			return new TRPCError({
				code: "CONFLICT",
				message: `Peer "${intention.peerId}" is already connected to  user "${targetPeer.email}".`,
			});
		}
		const targetUser = targetUsers.find(
			(user) => user.email === intention.email.lowercase,
		);
		if (!targetUser) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `User with email "${intention.email.original}" does not exist.`,
			});
		}
		if (targetUser.peerName && targetUser.reciprocalPeerId) {
			return new TRPCError({
				code: "CONFLICT",
				message: `User with email "${intention.email.original}" is already connected to peer "${targetUser.peerName}".`,
			});
		}
		const directIntentionByUser = directIntentions.find(
			({ targetUserId }) => targetUserId === targetUser.id,
		);
		if (directIntentionByUser) {
			return new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to "${intention.email.original}" as peer "${directIntentionByUser.name}".`,
			});
		}
		const directIntentionByPeer = directIntentions.find(
			({ peerId }) => peerId === intention.peerId,
		);
		if (directIntentionByPeer) {
			return new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to peer "${directIntentionByPeer.name}".`,
			});
		}
		const viceVersaIntention = viceVersaIntentions.find(
			({ userId }) => userId === targetUser.id,
		);
		if (viceVersaIntention) {
			return {
				type: "vice-versa" as const,
				targetUser: {
					id: targetUser.id,
					email: targetUser.email,
					avatarUrl: targetUser.avatarUrl,
				},
				asPeer: {
					id: intention.peerId,
					name: targetPeer.name,
				},
				viceVersaPeer: {
					id: viceVersaIntention.peerId,
				},
			};
		}
		return {
			type: "direct" as const,
			targetUser: {
				id: targetUser.id,
				email: targetUser.email,
				avatarUrl: targetUser.avatarUrl,
			},
			asPeer: {
				id: intention.peerId,
				name: targetPeer.name,
			},
		};
	});

type Intention = Exclude<
	ReturnType<typeof getIntentionsOrErrors>[number],
	TRPCError
>;

const insertViceVersaIntentions = async (
	ctx: AuthorizedContext,
	intentions: Extract<Intention, { type: "vice-versa" }>[],
) => {
	if (intentions.length === 0) {
		return;
	}
	await ctx.database.transaction().execute((tx) =>
		Promise.all([
			...intentions.map((intention) =>
				tx
					.updateTable("peers")
					.set({ connectedUserId: ctx.auth.userId })
					.where((eb) =>
						eb.and({
							ownerUserId: intention.targetUser.id,
							id: intention.viceVersaPeer.id,
						}),
					)
					.executeTakeFirst(),
			),
			...intentions.map((intention) =>
				tx
					.updateTable("peers")
					.set({ connectedUserId: intention.targetUser.id })
					.where((eb) =>
						eb.and({
							ownerUserId: ctx.auth.userId,
							id: intention.asPeer.id,
						}),
					)
					.executeTakeFirst(),
			),
		]),
	);
};

const insertDirectIntentions = async (
	ctx: AuthorizedContext,
	intentions: Extract<Intention, { type: "direct" }>[],
) => {
	if (intentions.length === 0) {
		return;
	}
	await ctx.database
		.transaction()
		.execute((tx) =>
			Promise.all(
				intentions.map((intention) =>
					tx
						.updateTable("peers")
						.set({ connectedUserId: intention.targetUser.id })
						.where("ownerUserId", "=", ctx.auth.userId)
						.where("id", "=", intention.asPeer.id)
						.executeTakeFirst(),
				),
			),
		);
};

type IntentionOutput = {
	user: {
		id: UserId;
		email: string;
		avatarUrl?: string;
	};
	connected: boolean;
	peer: {
		name: string;
	};
};

export const batchFn: BatchLoadContextFn<
	AuthorizedContext,
	z.infer<typeof addConnectionIntentionSchema>,
	IntentionOutput,
	TRPCError
> = (ctx) => async (inputs) => {
	const duplicatedEmails = getDuplicates(
		inputs,
		(intention) => intention.email.lowercase,
	);
	if (duplicatedEmails.length !== 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Expected to have unique emails, got repeating emails: ${duplicatedEmails
				.map(([email, count]) => `"${email}" (${count} times)`)
				.join(", ")}.`,
		});
	}
	const duplicatedPeerIds = getDuplicates(
		inputs,
		(intention) => intention.peerId,
	);
	if (duplicatedPeerIds.length !== 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Expected to have unique peer ids, got repeating: ${duplicatedPeerIds
				.map(([peerId, count]) => `"${peerId}" (${count} times)`)
				.join(", ")}.`,
		});
	}
	const data = await getData(ctx, inputs);
	const intentionsOrErrors = getIntentionsOrErrors(ctx, inputs, data);
	const intentions = intentionsOrErrors.filter(
		(
			intentionOrError,
		): intentionOrError is Exclude<typeof intentionOrError, TRPCError> =>
			!(intentionOrError instanceof TRPCError),
	);
	const directIntentions = intentions.filter(
		(intention): intention is Extract<typeof intention, { type: "direct" }> =>
			intention.type === "direct",
	);
	const viceVersaIntentions = intentions.filter(
		(
			intention,
		): intention is Extract<typeof intention, { type: "vice-versa" }> =>
			intention.type === "vice-versa",
	);
	await Promise.all([
		insertDirectIntentions(ctx, directIntentions),
		insertViceVersaIntentions(ctx, viceVersaIntentions),
	]);
	return intentionsOrErrors.map((intentionOrError) => {
		if (intentionOrError instanceof TRPCError) {
			return intentionOrError;
		}
		const matchedDirectIntention = directIntentions.find(
			({ targetUser }) => targetUser.id === intentionOrError.targetUser.id,
		);
		const matchedViceVersaIntention = viceVersaIntentions.find(
			({ targetUser }) => targetUser.id === intentionOrError.targetUser.id,
		);
		/* c8 ignore start */
		if (!matchedViceVersaIntention && !matchedDirectIntention) {
			return new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Expected to have an intention in either direct or vice-versa connection list.`,
			});
		}
		/* c8 ignore stop */
		return {
			user: {
				id: intentionOrError.targetUser.id,
				email: intentionOrError.targetUser.email,
				avatarUrl: intentionOrError.targetUser.avatarUrl || undefined,
			},
			connected: Boolean(matchedViceVersaIntention),
			peer: {
				name: intentionOrError.asPeer.name,
			},
		};
	});
};

export const procedure = authProcedure
	.meta({
		title: "Add  user connection intention",
		description:
			"Sends an  user connection intention for a given peerId to a given email, or accepts a matching vice-versa intention immediately.",
	})
	.input(addConnectionIntentionSchema)
	.mutation(queueCallFactory(batchFn));
