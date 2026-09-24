import { TRPCError } from "@trpc/server";
import { unique } from "remeda";
import z from "zod/v4";

import type { ReceiptId } from "~db/ids";
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
	const [peers, receipts] = await Promise.all([
		// @ts-expect-error TODO
		// TODO: Добавить чужие чеки в которых ты участвуешь, собрать список id'шек
		// В два массива: свои чеки + чужие чеки в которых я
		// Добавим их отображение в модалку и будем в ней показывать какие чеки с людьми не рассчитаны
		// Если дешево получится - можно будет прямо в профиле пользователя смотреть что какой-чек с ним не зарезолвлен
		ctx.database
			.selectFrom("peers")
			.where("peers.id", "in", peerIds)
			.select(["peers.id", "peers.ownerAccountId"])
			.execute(),
		ctx.database
			.selectFrom("receiptParticipants")
			.where("receiptParticipants.peerId", "in", peerIds)
			.select(["receiptParticipants.peerId", "receiptParticipants.receiptId"])
			.execute(),
	]);
	return { peers, receipts };
};

const queueGetAllPeer = queueCallFactory<
	AuthorizedContext,
	Input,
	{ id: ReceiptId }[]
>((ctx) => async (inputs) => {
	const { peers, receipts } = await getData(ctx, inputs);
	return inputs.map((input) => {
		const matchedPeer = peers.find((result) => result.id === input.peerId);
		if (!matchedPeer) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${input.peerId}" does not exist.`,
			});
		}
		if (matchedPeer.ownerAccountId !== ctx.auth.accountId) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${matchedPeer.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		return receipts
			.filter((receipt) => receipt.peerId === input.peerId)
			.map((receipt) => ({ id: receipt.receiptId }));
	});
});

export const procedure = authProcedure
	.input(getAllPeerSchema)
	.query(queueGetAllPeer);
