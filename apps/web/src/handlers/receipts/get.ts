import { TRPCError } from "@trpc/server";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod";

import type { DebtId, PeerId, ReceiptId, UserId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { receiptIdSchema } from "~web/handlers/validation";

const fetchReceipts = async (
	{ database, auth }: AuthorizedContext,
	ids: ReceiptId[],
) =>
	database
		.selectFrom("receipts")
		.where("receipts.id", "in", ids)
		.innerJoin("peers as meFromReceiptOwnerView", (jb) =>
			jb
				.on("meFromReceiptOwnerView.connectedUserId", "=", auth.userId)
				.onRef(
					"meFromReceiptOwnerView.ownerUserId",
					"=",
					"receipts.ownerUserId",
				),
		)
		.innerJoin("peers as receiptOwnerFromMyView", (jb) =>
			jb
				.onRef(
					"receiptOwnerFromMyView.ownerUserId",
					"=",
					"meFromReceiptOwnerView.connectedUserId",
				)
				.onRef(
					"receiptOwnerFromMyView.connectedUserId",
					"=",
					"receipts.ownerUserId",
				),
		)
		.select((eb) => [
			"receipts.id",
			"receipts.createdAt",
			"receipts.name",
			"receipts.currencyCode",
			"receipts.ownerUserId",
			"receipts.issued",
			"receiptOwnerFromMyView.id as ownerPeerId",
			"meFromReceiptOwnerView.id as selfPeerId",
			jsonArrayFrom(
				eb
					.selectFrom("receiptItems")
					.select((ebb) => [
						"receiptItems.id",
						"receiptItems.name",
						"receiptItems.price",
						"receiptItems.quantity",
						"receiptItems.createdAt",
						jsonArrayFrom(
							ebb
								.selectFrom("receiptItemConsumers")
								.select([
									"receiptItemConsumers.part",
									"receiptItemConsumers.peerId",
									"receiptItemConsumers.createdAt",
								])
								.whereRef("receiptItemConsumers.itemId", "=", "receiptItems.id")
								.orderBy("receiptItemConsumers.createdAt", "desc")
								.orderBy("receiptItemConsumers.peerId"),
						).as("consumers"),
						jsonArrayFrom(
							ebb
								.selectFrom("receiptItemPayers")
								.select([
									"receiptItemPayers.part",
									"receiptItemPayers.peerId",
									"receiptItemPayers.createdAt",
								])
								.whereRef("receiptItemPayers.itemId", "=", "receiptItems.id")
								.orderBy("receiptItemPayers.createdAt", "desc")
								.orderBy("receiptItemPayers.peerId"),
						).as("payers"),
					])
					.whereRef("receiptItems.receiptId", "=", "receipts.id")
					.orderBy("receiptItems.createdAt", "desc")
					.orderBy("receiptItems.id"),
			).as("items"),
			jsonArrayFrom(
				eb
					.selectFrom("receiptParticipants")
					.whereRef("receiptParticipants.receiptId", "=", "receipts.id")
					.innerJoin("peers as peersTheir", (jb) =>
						jb.onRef("peersTheir.id", "=", "receiptParticipants.peerId"),
					)
					.leftJoin("peers as peersMine", (jb) =>
						jb
							.onRef(
								"peersMine.connectedUserId",
								"=",
								"peersTheir.connectedUserId",
							)
							.on("peersMine.ownerUserId", "=", auth.userId),
					)
					.select([
						"receiptParticipants.peerId",
						"receiptParticipants.createdAt",
						"receiptParticipants.role",
					])
					.orderBy("receiptParticipants.createdAt", "desc")
					.orderBy("receiptParticipants.peerId"),
			).as("participants"),
		])
		.execute();

const fetchDebts = async (
	{ database }: AuthorizedContext,
	receiptIds: ReceiptId[],
) =>
	database
		.selectFrom("debts")
		.innerJoin("peers", (qb) => qb.onRef("peers.id", "=", "debts.peerId"))
		.where("debts.receiptId", "in", receiptIds)
		.select([
			"debts.id as debtId",
			"debts.receiptId",
			"debts.ownerUserId",
			"peers.id as peerId",
		])
		.execute();

const getReceiptDebts = (
	debts: Awaited<ReturnType<typeof fetchDebts>>,
	receiptOwnerUserId: UserId,
	selfUserId: UserId,
	receiptSelfPeerId: PeerId,
):
	| ({
			direction: "incoming";
	  } & (
			| { id: DebtId; hasMine: true; hasForeign: boolean }
			| { id: DebtId; hasMine: false; hasForeign: true }
			| { id: undefined; hasMine: false; hasForeign: false }
	  ))
	| {
			direction: "outcoming";
			debts: { id: DebtId; peerId: PeerId }[];
	  } => {
	if (receiptOwnerUserId === selfUserId) {
		const outcomingDebt = debts
			.filter((debt) => debt.ownerUserId === selfUserId)
			.toSorted((a, b) => a.debtId.localeCompare(b.debtId))
			.map((debt) => ({ id: debt.debtId, peerId: debt.peerId }));
		return {
			direction: "outcoming",
			debts: outcomingDebt,
		};
	}
	const mineDebtId = debts.find(
		(debt) => debt.ownerUserId === selfUserId,
	)?.debtId;
	const foreignDebtId = debts.find(
		(debt) =>
			debt.ownerUserId !== selfUserId && debt.peerId === receiptSelfPeerId,
	)?.debtId;
	if (mineDebtId) {
		return {
			direction: "incoming",
			id: mineDebtId,
			hasMine: true,
			hasForeign: Boolean(foreignDebtId),
		};
	}
	if (foreignDebtId) {
		return {
			direction: "incoming",
			id: foreignDebtId,
			hasMine: false,
			hasForeign: true,
		};
	}
	return {
		direction: "incoming",
		id: undefined,
		hasMine: false,
		hasForeign: false,
	};
};

const mapReceipt = (
	auth: AuthorizedContext["auth"],
	receipt: Awaited<ReturnType<typeof fetchReceipts>>[number],
	debts: Awaited<ReturnType<typeof fetchDebts>>,
) => {
	const { ownerUserId, items, participants, ...receiptRest } = receipt;
	const payersItem = items.find((item) => item.id === receipt.id);
	const regularItems = items.filter((item) => item !== payersItem);
	return {
		...receiptRest,
		items: regularItems.map((item) => ({
			...item,
			price: Number(item.price),
			quantity: Number(item.quantity),
			payers: item.payers.map(({ part, ...consumer }) => ({
				...consumer,
				part: Number(part),
			})),
			consumers: item.consumers.map(({ part, ...consumer }) => ({
				...consumer,
				part: Number(part),
			})),
		})),
		participants,
		debts: getReceiptDebts(debts, ownerUserId, auth.userId, receipt.selfPeerId),
		// This can't happen as payers item always exists
		payers:
			/* c8 ignore next */
			payersItem?.consumers.map((payer) => ({
				...payer,
				part: Number(payer.part),
			})) ?? [],
	};
};

type Receipt = ReturnType<typeof mapReceipt>;

const queueReceipt = queueCallFactory<
	AuthorizedContext,
	{ id: ReceiptId },
	Receipt
>((ctx) => async (inputs) => {
	const receiptIds = inputs.map(({ id }) => id);
	const [receipts, debts] = await Promise.all([
		fetchReceipts(ctx, receiptIds),
		fetchDebts(ctx, receiptIds),
	]);
	return inputs.map((input) => {
		const receipt = receipts.find(({ id }) => id === input.id);
		if (!receipt) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.id}" is not found.`,
			});
		}
		if (
			receipt.ownerPeerId !== ctx.auth.userId &&
			!receipt.participants.some(
				(participant) => participant.peerId === receipt.selfPeerId,
			)
		) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `User "${ctx.auth.email}" has no access to receipt "${receipt.id}"`,
			});
		}
		try {
			const mapped = mapReceipt(
				ctx.auth,
				receipt,
				debts.filter((debt) => debt.receiptId === receipt.id),
			);
			return mapped;
			/* c8 ignore start */
		} catch (error) {
			return error as Error;
		}
		/* c8 ignore stop */
	});
});

export const procedure = authProcedure
	.meta({
		title: "Get receipt",
		description:
			"Returns a receipt by id with its items, participants, payers and linked debts, if the  user owns or participates in it.",
	})
	.input(
		z.strictObject({
			id: receiptIdSchema,
		}),
	)
	.query(queueReceipt);
