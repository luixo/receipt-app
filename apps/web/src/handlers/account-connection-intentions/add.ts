import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AccountId } from "~db/ids";
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
				.onRef(
					"reciprocalPeers.ownerAccountId",
					"=",
					"peers.connectedAccountId",
				)
				.onRef(
					"reciprocalPeers.connectedAccountId",
					"=",
					"peers.ownerAccountId",
				),
		)
		.leftJoin("accounts", (qb) =>
			qb.onRef("accounts.id", "=", "peers.connectedAccountId"),
		)
		.select([
			"peers.id",
			"peers.name",
			"accounts.email",
			"peers.ownerAccountId",
			"reciprocalPeers.id as reciprocalPeerId",
		])
		.execute();

const getTargetAccounts = async (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
) =>
	ctx.database
		.selectFrom("accounts")
		.where(
			"accounts.email",
			"in",
			intentions.map((intention) => intention.email.lowercase),
		)
		.leftJoin("peers", (qb) =>
			qb
				.onRef("peers.connectedAccountId", "=", "accounts.id")
				.on("peers.ownerAccountId", "=", ctx.auth.accountId),
		)
		.leftJoin("peers as reciprocalPeers", (qb) =>
			qb
				.onRef("reciprocalPeers.ownerAccountId", "=", "accounts.id")
				.on("reciprocalPeers.connectedAccountId", "=", ctx.auth.accountId),
		)
		.select([
			"accounts.id",
			"accounts.avatarUrl",
			"accounts.email",
			"peers.name as peerName",
			"reciprocalPeers.id as reciprocalPeerId",
		])
		.execute();

const getDirectIntentions = async (
	ctx: AuthorizedContext,
	targetAccountsPromise: ReturnType<typeof getTargetAccounts>,
	targetPeersPromise: ReturnType<typeof getTargetPeers>,
) => {
	const targetAccounts = await targetAccountsPromise;
	const targetPeers = await targetPeersPromise;
	if (targetAccounts.length === 0 || targetPeers.length === 0) {
		return [];
	}
	return ctx.database
		.selectFrom("peers")
		.leftJoin("peers as reciprocalPeers", (qb) =>
			qb
				.onRef(
					"reciprocalPeers.ownerAccountId",
					"=",
					"peers.connectedAccountId",
				)
				.onRef(
					"reciprocalPeers.connectedAccountId",
					"=",
					"peers.ownerAccountId",
				),
		)
		.where("peers.ownerAccountId", "=", ctx.auth.accountId)
		.where("peers.connectedAccountId", "is not", null)
		.where("reciprocalPeers.id", "is", null)
		.where((qb) =>
			qb.or([
				qb(
					"peers.connectedAccountId",
					"in",
					targetAccounts.map(({ id }) => id),
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
			"peers.connectedAccountId as targetAccountId",
			"peers.name",
		])
		.execute();
};

const getViceVersaIntentions = async (
	ctx: AuthorizedContext,
	targetAccountsPromise: ReturnType<typeof getTargetAccounts>,
) => {
	const targetAccounts = await targetAccountsPromise;
	if (targetAccounts.length === 0) {
		return [];
	}
	return ctx.database
		.selectFrom("peers")
		.leftJoin("peers as reciprocalPeers", (qb) =>
			qb
				.onRef(
					"reciprocalPeers.ownerAccountId",
					"=",
					"peers.connectedAccountId",
				)
				.onRef(
					"reciprocalPeers.connectedAccountId",
					"=",
					"peers.ownerAccountId",
				),
		)
		.where(
			"peers.ownerAccountId",
			"in",
			targetAccounts.map(({ id }) => id),
		)
		.where("peers.connectedAccountId", "=", ctx.auth.accountId)
		.where("reciprocalPeers.id", "is", null)
		.select(["peers.id as peerId", "peers.ownerAccountId as accountId"])
		.execute();
};

const getData = async (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
) => {
	const targetAccountsPromise = getTargetAccounts(ctx, intentions);
	const targetPeersPromise = getTargetPeers(ctx, intentions);

	return {
		targetAccounts: await targetAccountsPromise,
		targetPeers: await targetPeersPromise,
		directIntentions: await getDirectIntentions(
			ctx,
			targetAccountsPromise,
			targetPeersPromise,
		),
		viceVersaIntentions: await getViceVersaIntentions(
			ctx,
			targetAccountsPromise,
		),
	};
};

const getIntentionsOrErrors = (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
	{
		targetAccounts,
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
		if (targetPeer.ownerAccountId !== ctx.auth.accountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${intention.peerId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (targetPeer.email && targetPeer.reciprocalPeerId) {
			return new TRPCError({
				code: "CONFLICT",
				message: `Peer "${intention.peerId}" is already connected to account "${targetPeer.email}".`,
			});
		}
		const targetAccount = targetAccounts.find(
			(account) => account.email === intention.email.lowercase,
		);
		if (!targetAccount) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Account with email "${intention.email.original}" does not exist.`,
			});
		}
		if (targetAccount.peerName && targetAccount.reciprocalPeerId) {
			return new TRPCError({
				code: "CONFLICT",
				message: `Account with email "${intention.email.original}" is already connected to peer "${targetAccount.peerName}".`,
			});
		}
		const directIntentionByAccount = directIntentions.find(
			({ targetAccountId }) => targetAccountId === targetAccount.id,
		);
		if (directIntentionByAccount) {
			return new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to "${intention.email.original}" as peer "${directIntentionByAccount.name}".`,
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
			({ accountId }) => accountId === targetAccount.id,
		);
		if (viceVersaIntention) {
			return {
				type: "vice-versa" as const,
				targetAccount: {
					id: targetAccount.id,
					email: targetAccount.email,
					avatarUrl: targetAccount.avatarUrl,
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
			targetAccount: {
				id: targetAccount.id,
				email: targetAccount.email,
				avatarUrl: targetAccount.avatarUrl,
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
					.set({ connectedAccountId: ctx.auth.accountId })
					.where((eb) =>
						eb.and({
							ownerAccountId: intention.targetAccount.id,
							id: intention.viceVersaPeer.id,
						}),
					)
					.executeTakeFirst(),
			),
			...intentions.map((intention) =>
				tx
					.updateTable("peers")
					.set({ connectedAccountId: intention.targetAccount.id })
					.where((eb) =>
						eb.and({
							ownerAccountId: ctx.auth.accountId,
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
						.set({ connectedAccountId: intention.targetAccount.id })
						.where("ownerAccountId", "=", ctx.auth.accountId)
						.where("id", "=", intention.asPeer.id)
						.executeTakeFirst(),
				),
			),
		);
};

type IntentionOutput = {
	account: {
		id: AccountId;
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
			({ targetAccount }) =>
				targetAccount.id === intentionOrError.targetAccount.id,
		);
		const matchedViceVersaIntention = viceVersaIntentions.find(
			({ targetAccount }) =>
				targetAccount.id === intentionOrError.targetAccount.id,
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
			account: {
				id: intentionOrError.targetAccount.id,
				email: intentionOrError.targetAccount.email,
				avatarUrl: intentionOrError.targetAccount.avatarUrl || undefined,
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
		title: "Add account connection intention",
		description:
			"Sends an account connection intention for a given peerId to a given email, or accepts a matching vice-versa intention immediately.",
	})
	.input(addConnectionIntentionSchema)
	.mutation(queueCallFactory(batchFn));
