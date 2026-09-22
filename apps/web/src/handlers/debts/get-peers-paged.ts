import { z } from "zod";

import {
	debtsFiltersSchema,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import type { PeerId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	cursor: offsetSchema,
	limit: limitSchema,
	filters: debtsFiltersSchema.optional(),
});
type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<PeerId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	const debtSummaries = database
		.with("debtSummaries", () =>
			database
				.selectFrom("debts")
				.where("debts.ownerAccountId", "=", auth.accountId)
				.innerJoin("peers", (qb) => qb.onRef("peers.id", "=", "debts.peerId"))
				.select([
					"debts.peerId",
					"peers.name",
					"debts.currencyCode",
					database.fn.sum<string>("debts.amount").as("sum"),
				])
				.groupBy(["debts.peerId", "peers.name", "debts.currencyCode"]),
		)
		.selectFrom("debtSummaries");

	const peers = debtSummaries.$if(!input.filters?.showResolved, (qb) =>
		qb.where(
			"peerId",
			"not in",
			debtSummaries
				.select("peerId")
				.groupBy("peerId")
				.having(
					(eb) => eb.fn.count(eb.case().when("sum", "<>", "0").then(1).end()),
					"=",
					0,
				),
		),
	);

	const [paginatedPeers, totalCount] = await Promise.all([
		peers
			.select("peerId")
			.groupBy(["name", "peerId"])
			.orderBy("name")
			.orderBy("peerId")
			.offset(input.cursor)
			.limit(input.limit)
			.execute(),
		database
			.selectFrom(peers.select("peerId").groupBy("peerId").as("groupedPeers"))
			.select((eb) => eb.fn.count<number>("peerId").as("count"))
			.executeTakeFirstOrThrow(),
	]);

	return {
		count: totalCount.count,
		cursor: input.cursor,
		items: paginatedPeers.map(({ peerId }) => peerId),
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
		title: "Get peers with debts, paged",
		description:
			"Returns a page of peerIds the current account has debts with, optionally excluding peers whose debts are fully resolved.",
	})
	.input(inputSchema)
	.query(queuePeerList);
