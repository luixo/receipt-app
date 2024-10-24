import { TRPCError } from "@trpc/server";
import { entries } from "remeda";
import { z } from "zod";

import type { AccountsId } from "~db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { emailSchema, userIdSchema } from "~web/handlers/validation";

const addConnectionIntentionSchema = z.strictObject({
	userId: userIdSchema,
	email: emailSchema,
});
type ConnectionIntention = z.infer<typeof addConnectionIntentionSchema>;

const getTargetUsers = async (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
) =>
	ctx.database
		.selectFrom("users")
		.where(
			"users.id",
			"in",
			intentions.map((intention) => intention.userId),
		)
		.leftJoin("accounts", (qb) =>
			qb.onRef("accounts.id", "=", "users.connectedAccountId"),
		)
		.select([
			"users.id",
			"users.name",
			"accounts.email",
			"users.ownerAccountId",
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
		.leftJoin("users", (qb) =>
			qb
				.onRef("users.connectedAccountId", "=", "accounts.id")
				.on("users.ownerAccountId", "=", ctx.auth.accountId),
		)
		.select([
			"accounts.id",
			"accounts.avatarUrl",
			"accounts.email",
			"users.name as userName",
		])
		.execute();

const getDirectIntentions = async (
	ctx: AuthorizedContext,
	targetAccountsPromise: ReturnType<typeof getTargetAccounts>,
	targetUsersPromise: ReturnType<typeof getTargetUsers>,
) => {
	const targetAccounts = await targetAccountsPromise;
	const targetUsers = await targetUsersPromise;
	if (targetAccounts.length === 0 || targetUsers.length === 0) {
		return [];
	}
	return ctx.database
		.selectFrom("accountConnectionsIntentions")
		.where("accountConnectionsIntentions.accountId", "=", ctx.auth.accountId)
		.where((qb) =>
			qb.or([
				qb(
					"accountConnectionsIntentions.targetAccountId",
					"in",
					targetAccounts.map(({ id }) => id),
				),
				qb(
					"accountConnectionsIntentions.userId",
					"in",
					targetUsers.map(({ id }) => id),
				),
			]),
		)
		.innerJoin("users", (qb) =>
			qb.onRef("users.id", "=", "accountConnectionsIntentions.userId"),
		)
		.select([
			"accountConnectionsIntentions.userId",
			"accountConnectionsIntentions.targetAccountId",
			"users.name",
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
		.selectFrom("accountConnectionsIntentions")
		.where(
			"accountConnectionsIntentions.accountId",
			"in",
			targetAccounts.map(({ id }) => id),
		)
		.where(
			"accountConnectionsIntentions.targetAccountId",
			"=",
			ctx.auth.accountId,
		)
		.select([
			"accountConnectionsIntentions.userId",
			"accountConnectionsIntentions.accountId",
		])
		.execute();
};

const getData = async (
	ctx: AuthorizedContext,
	intentions: readonly ConnectionIntention[],
) => {
	const targetAccountsPromise = getTargetAccounts(ctx, intentions);
	const targetUsersPromise = getTargetUsers(ctx, intentions);

	return {
		targetAccounts: await targetAccountsPromise,
		targetUsers: await targetUsersPromise,
		directIntentions: await getDirectIntentions(
			ctx,
			targetAccountsPromise,
			targetUsersPromise,
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
		targetUsers,
		viceVersaIntentions,
		directIntentions,
	}: Awaited<ReturnType<typeof getData>>,
) =>
	intentions.map((intention) => {
		const targetUser = targetUsers.find((user) => user.id === intention.userId);
		if (!targetUser) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `User "${intention.userId}" does not exist.`,
			});
		}
		if (targetUser.ownerAccountId !== ctx.auth.accountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `User "${intention.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		if (targetUser.email) {
			return new TRPCError({
				code: "CONFLICT",
				message: `User "${intention.userId}" is already connected to account "${targetUser.email}".`,
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
		if (targetAccount.userName) {
			return new TRPCError({
				code: "CONFLICT",
				message: `Account with email "${intention.email.original}" is already connected to user "${targetAccount.userName}".`,
			});
		}
		const directIntentionByAccount = directIntentions.find(
			({ targetAccountId }) => targetAccountId === targetAccount.id,
		);
		if (directIntentionByAccount) {
			return new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to "${intention.email.original}" as user "${directIntentionByAccount.name}".`,
			});
		}
		const directIntentionByUser = directIntentions.find(
			({ userId }) => userId === intention.userId,
		);
		if (directIntentionByUser) {
			return new TRPCError({
				code: "CONFLICT",
				message: `You already has intention to connect to user "${directIntentionByUser.name}".`,
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
				asUser: {
					id: intention.userId,
					name: targetUser.name,
				},
				viceVersaUser: {
					id: viceVersaIntention.userId,
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
			asUser: {
				id: intention.userId,
				name: targetUser.name,
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
					.updateTable("users")
					.set({ connectedAccountId: ctx.auth.accountId })
					.where((eb) =>
						eb.and({
							ownerAccountId: intention.targetAccount.id,
							id: intention.viceVersaUser.id,
						}),
					)
					.executeTakeFirst(),
			),
			...intentions.map((intention) =>
				tx
					.updateTable("users")
					.set({ connectedAccountId: intention.targetAccount.id })
					.where((eb) =>
						eb.and({
							ownerAccountId: ctx.auth.accountId,
							id: intention.asUser.id,
						}),
					)
					.executeTakeFirst(),
			),
			tx
				.deleteFrom("accountConnectionsIntentions")
				.where(
					"accountConnectionsIntentions.targetAccountId",
					"=",
					ctx.auth.accountId,
				)
				.where(
					"accountConnectionsIntentions.accountId",
					"in",
					intentions.map((intention) => intention.targetAccount.id),
				)
				.executeTakeFirst(),
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
		.insertInto("accountConnectionsIntentions")
		.values(
			intentions.map((intention) => ({
				accountId: ctx.auth.accountId,
				targetAccountId: intention.targetAccount.id,
				userId: intention.asUser.id,
				createdAt: new Date(),
			})),
		)
		.execute();
};

const getDuplicates = <T, K extends string>(
	array: readonly T[],
	getKey: (item: T) => K,
) =>
	entries(
		array
			.map(getKey)
			.reduce<Partial<Record<string, number>>>(
				(acc, element) => ({ ...acc, [element]: (acc[element] ?? 0) + 1 }),
				{},
			),
	).filter(([, value]) => value !== 1);

type IntentionOutput = {
	account: {
		id: AccountsId;
		email: string;
		avatarUrl?: string;
	};
	connected: boolean;
	user: {
		name: string;
	};
};

export const batchFn =
	(ctx: AuthorizedContext) =>
	async (
		inputs: readonly z.infer<typeof addConnectionIntentionSchema>[],
	): Promise<(IntentionOutput | TRPCError)[]> => {
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
		const duplicatedUserIds = getDuplicates(
			inputs,
			(intention) => intention.userId,
		);
		if (duplicatedUserIds.length !== 0) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Expected to have unique user ids, got repeating: ${duplicatedUserIds
					.map(([userId, count]) => `"${userId}" (${count} times)`)
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
				user: {
					name: intentionOrError.asUser.name,
				},
			};
		});
	};

const queueAddConnectionIntenion = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof addConnectionIntentionSchema>,
	IntentionOutput
>(batchFn);

export const procedure = authProcedure
	.input(addConnectionIntentionSchema)
	.mutation(queueAddConnectionIntenion);
