import { TRPCError } from "@trpc/server";
import type { Insertable } from "kysely";
import { isNonNullish } from "remeda";
import { z } from "zod";

import { peerNameSchema } from "~app/utils/validation";
import type { PeerId } from "~db/ids";
import type { DB } from "~db/types.gen";
import { batchFn as addAccountConnectionIntentions } from "~web/handlers/account-connection-intentions/add";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { emailSchema } from "~web/handlers/validation";

const addPeerSchema = z.strictObject({
	name: peerNameSchema,
	publicName: peerNameSchema.optional(),
	email: emailSchema.optional(),
});

const getPeers = (
	ctx: AuthorizedContext,
	inputs: readonly z.infer<typeof addPeerSchema>[],
) =>
	inputs.map((input) => {
		const id = ctx.getUuid() as PeerId;
		return {
			peer: {
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
	connections: ReturnType<typeof getPeers>[number]["connection"][],
) => {
	const nonEmptyConnections = connections.filter(isNonNullish);
	if (nonEmptyConnections.length === 0) {
		return [];
	}
	const intentions = await addAccountConnectionIntentions(ctx)(
		nonEmptyConnections.map((input) => ({
			email: input.email,
			peerId: input.id,
		})),
	);
	return connections.map((connection) => {
		if (!connection) {
			return undefined;
		}
		const matchedNonEmptyConnectionIndex =
			nonEmptyConnections.indexOf(connection);
		const matchedIntentionOrError = intentions[matchedNonEmptyConnectionIndex];
		if (matchedIntentionOrError instanceof TRPCError) {
			throw matchedIntentionOrError;
		}
		return matchedIntentionOrError;
	});
};

const insertPeers = async (
	ctx: AuthorizedContext,
	peers: Insertable<DB["peers"]>[],
) => {
	await ctx.database.insertInto("peers").values(peers).execute();
};

const queueAddPeer = queueCallFactory<
	AuthorizedContext,
	z.infer<typeof addPeerSchema>,
	{
		id: PeerId;
		connection?: Exclude<
			Awaited<
				ReturnType<ReturnType<typeof addAccountConnectionIntentions>>
			>[number],
			TRPCError
		>;
	}
>((ctx) => async (inputs) => {
	const peersWithConnections = getPeers(ctx, inputs);
	await insertPeers(
		ctx,
		peersWithConnections.map(({ peer }) => peer),
	);
	const connections = await insertConnections(
		ctx,
		peersWithConnections.map(({ connection }) => connection),
	);
	return peersWithConnections.map(({ peer }, index) => ({
		id: peer.id,
		connection: connections[index],
	}));
});

export const procedure = authProcedure
	.meta({
		title: "Add peer",
		description:
			"Creates a new peer owned by the current account, optionally sending a connection intention to a given email.",
	})
	.input(addPeerSchema)
	.mutation(queueAddPeer);
