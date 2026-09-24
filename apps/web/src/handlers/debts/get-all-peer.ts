import { TRPCError } from "@trpc/server";
import { unique } from "remeda";
import z from "zod";

import type { CurrencyCode } from "~app/utils/currency";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema } from "~web/handlers/validation";

const getAllPeerSchema = z.strictObject({
	peerId: peerIdSchema,
});
type Input = z.infer<typeof getAllPeerSchema>;

const getData = async (ctx: AuthorizedContext, inputs: readonly Input[]) => {
	const peerIds = unique(inputs.map(({ peerId }) => peerId));
	const [peers, aggregatedDebts] = await Promise.all([
		ctx.database
			.selectFrom("peers")
			.where("peers.id", "in", peerIds)
			.select(["peers.id", "peers.ownerUserId"])
			.execute(),
		ctx.database
			.selectFrom("debts")
			.where("debts.ownerUserId", "=", ctx.auth.userId)
			.where("debts.peerId", "in", peerIds)
			.select([
				"debts.peerId",
				"debts.currencyCode",
				(eb) => eb.fn.sum<string>("debts.amount").as("sum"),
			])
			.orderBy("debts.currencyCode")
			.groupBy(["debts.currencyCode", "debts.peerId"])
			.execute(),
	]);
	return { peers, aggregatedDebts };
};

const queueGetAllPeer = queueCallFactory<
	AuthorizedContext,
	Input,
	{ items: { currencyCode: CurrencyCode; sum: number }[] }
>((ctx) => async (inputs) => {
	const { peers, aggregatedDebts } = await getData(ctx, inputs);
	return inputs.map((debt) => {
		const matchedPeer = peers.find((result) => result.id === debt.peerId);
		if (!matchedPeer) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${debt.peerId}" does not exist.`,
			});
		}
		if (matchedPeer.ownerUserId !== ctx.auth.userId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${matchedPeer.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		const filteredDebts = aggregatedDebts.filter(
			(aggregatedDebt) => aggregatedDebt.peerId === debt.peerId,
		);
		return {
			items: filteredDebts.map(({ currencyCode, sum }) => ({
				currencyCode,
				sum: Number(sum),
			})),
		};
	});
});

export const procedure = authProcedure
	.meta({
		title: "Get all debts for peer",
		description:
			"Returns the current  user's debt amounts with a given peerId, summed per currency.",
	})
	.input(getAllPeerSchema)
	.query(queueGetAllPeer);
