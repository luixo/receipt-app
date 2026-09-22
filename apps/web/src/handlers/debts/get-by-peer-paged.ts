import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	debtsByPeerFiltersSchema,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import type { DebtId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";
import type { GeneralOutput } from "~web/utils/batch";
import { queueList } from "~web/utils/batch";

const inputSchema = z.strictObject({
	peerId: peerIdSchema,
	cursor: offsetSchema,
	limit: limitSchema,
	filters: debtsByPeerFiltersSchema.optional().default({}),
});

type Input = z.infer<typeof inputSchema>;
type Output = GeneralOutput<DebtId> & { count: number };

const fetchPage = async (
	{ database, auth }: AuthorizedContext,
	input: Input,
) => {
	const peer = await database
		.selectFrom("peers")
		.where("peers.id", "=", input.peerId)
		.select("peers.ownerAccountId")
		.limit(1)
		.executeTakeFirst();
	if (!peer) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Peer "${input.peerId}" does not exist.`,
		});
	}
	if (peer.ownerAccountId !== auth.accountId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Peer "${input.peerId}" is not owned by "${auth.email}".`,
		});
	}
	const currencySums = database
		.selectFrom("debts")
		.where((eb) =>
			eb.and({
				"debts.peerId": input.peerId,
				"debts.ownerAccountId": auth.accountId,
			}),
		)
		.select([
			"debts.currencyCode",
			database.fn.sum<string>("debts.amount").as("sum"),
		])
		.groupBy("debts.currencyCode");

	const debts = database
		.with("currencySums", () => currencySums)
		.selectFrom("debts")
		.where((eb) =>
			eb.and({
				"debts.peerId": input.peerId,
				"debts.ownerAccountId": auth.accountId,
			}),
		)
		.$if(!input.filters.showResolved, (qb) =>
			qb.where(
				"debts.currencyCode",
				"in",
				database
					.with("currencySums", () => currencySums)
					.selectFrom("currencySums")
					.select("currencyCode")
					.where("sum", "!=", "0"),
			),
		);

	const [paginatedDebts, totalCount] = await Promise.all([
		debts
			.select(["debts.id"])
			.orderBy("debts.timestamp", "desc")
			.orderBy("debts.id")
			.offset(input.cursor)
			.limit(input.limit)
			.execute(),
		debts
			.select((eb) => eb.fn.count<number>("debts.id").as("count"))
			.executeTakeFirstOrThrow(),
	]);

	return {
		count: totalCount.count,
		cursor: input.cursor,
		items: paginatedDebts.map((debt) => debt.id),
	};
};

const queueDebtList = queueCallFactory<AuthorizedContext, Input, Output>(
	(ctx) => async (inputs) =>
		queueList<Input, DebtId, Output>(inputs, (value) => fetchPage(ctx, value)),
);

export const procedure = authProcedure
	.meta({
		title: "Get debts by peer, paged",
		description:
			"Returns a page of debt ids owned by the current account for a given peerId, optionally excluding resolved currencies.",
	})
	.input(inputSchema)
	.query(queueDebtList);
