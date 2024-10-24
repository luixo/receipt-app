import { TRPCError } from "@trpc/server";
import { isNonNullish } from "remeda";
import { z } from "zod";

import { userNameSchema } from "~app/utils/validation";
import type { UsersId, UsersInitializer } from "~db/models";
import { batchFn as addAccountConnectionIntentions } from "~web/handlers/account-connection-intentions/add";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { emailSchema } from "~web/handlers/validation";

const addUserSchema = z.strictObject({
	name: userNameSchema,
	publicName: userNameSchema.optional(),
	email: emailSchema.optional(),
});

const getUsers = (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addUserSchema>[],
) =>
	inputs.map((input) => {
		const id = ctx.getUuid() as UsersId;
		return {
			user: {
				id,
				ownerAccountId: ctx.auth.accountId,
				name: input.name,
				publicName: input.publicName,
			},
			connection: input.email
				? {
						name: input.name,
						email: input.email,
						id,
				  }
				: undefined,
		};
	});

const insertConnections = async (
	ctx: AuthorizedContext,
	connections: ReturnType<typeof getUsers>[number]["connection"][],
) => {
	const nonEmptyConnections = connections.filter(isNonNullish);
	if (nonEmptyConnections.length === 0) {
		return [];
	}
	const intentions = await addAccountConnectionIntentions(ctx)(
		nonEmptyConnections.map((input) => ({
			email: input.email,
			userId: input.id,
		})),
	);
	return connections.map((connection) => {
		if (!connection) {
			return;
		}
		const matchedNonEmptyConnectionIndex = nonEmptyConnections.findIndex(
			(nonEmptyConnection) => nonEmptyConnection === connection,
		);
		const matchedIntentionOrError = intentions[matchedNonEmptyConnectionIndex];
		if (matchedIntentionOrError instanceof TRPCError) {
			throw matchedIntentionOrError;
		}
		return matchedIntentionOrError;
	});
};

const insertUsers = async (
	ctx: AuthorizedContext,
	users: UsersInitializer[],
) => {
	await ctx.database.insertInto("users").values(users).execute();
};

const queueAddUser = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof addUserSchema>,
	{
		id: UsersId;
		connection?: Exclude<
			Awaited<
				ReturnType<ReturnType<typeof addAccountConnectionIntentions>>
			>[number],
			TRPCError
		>;
	}
>((ctx) => async (inputs) => {
	const usersWithConnections = getUsers(ctx, inputs);
	await insertUsers(
		ctx,
		usersWithConnections.map(({ user }) => user),
	);
	const connections = await insertConnections(
		ctx,
		usersWithConnections.map(({ connection }) => connection),
	);
	return usersWithConnections.map(({ user }, index) => ({
		id: user.id,
		connection: connections[index],
	}));
});

export const procedure = authProcedure
	.input(addUserSchema)
	.mutation(queueAddUser);
