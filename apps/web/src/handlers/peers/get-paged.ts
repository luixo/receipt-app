import { z } from "zod";

import { limitSchema, offsetSchema } from "~app/utils/validation";
import type { PeerId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	cursor: offsetSchema,
	limit: limitSchema,
});
type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<PeerId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	const accountPeers = database.selectFrom("peers").where((eb) =>
		eb("peers.ownerAccountId", "=", auth.accountId).and(
			"peers.id",
			"<>",
			// Typesystem doesn't know that we use account id as self peer id;
			auth.accountId as PeerId,
		),
	);
	const [peers, peersCount] = await Promise.all([
		accountPeers
			.select("peers.id")
			// Stable order for peers with the same name
			.orderBy("peers.name")
			.orderBy("peers.id")
			.offset(input.cursor)
			.limit(input.limit)
			.execute(),
		accountPeers
			.select(database.fn.count<number>("id").as("amount"))
			.executeTakeFirstOrThrow(),
	]);

	return {
		count: peersCount.amount,
		cursor: input.cursor,
		items: peers.map(({ id }) => id),
	};
};

const queuePeerList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, PeerId, Output>(inputs, (values) =>
			fetchPage(ctx, values),
		),
);

export const procedure = authProcedure
	.meta({
		title: "Get peers, paged",
		description:
			"Returns a page of peerIds owned by the current account, excluding the self-peer.",
	})
	.input(inputSchema)
	.query(queuePeerList);
