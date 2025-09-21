import { TRPCError } from "@trpc/server";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod";

import type { AccountId, DebtId, ReceiptId, UserId } from "~db/ids";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import type { Role } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { receiptIdSchema } from "~web/handlers/validation";

const fetchReceipts = async (
	{ database, auth }: AuthorizedContext,
	ids: ReceiptId[],
) =>
	database
		.selectFrom("receipts")
		.where("receipts.id", "in", ids)
		.innerJoin("users as meFromReceiptOwnerView", (jb) =>
			jb
				.on("meFromReceiptOwnerView.connectedAccountId", "=", auth.accountId)
				.onRef(
					"meFromReceiptOwnerView.ownerAccountId",
					"=",
					"receipts.ownerAccountId",
				),
		)
		.innerJoin("users as receiptOwnerFromMyView", (jb) =>
			jb
				.onRef(
					"receiptOwnerFromMyView.ownerAccountId",
					"=",
					"meFromReceiptOwnerView.connectedAccountId",
				)
				.onRef(
					"receiptOwnerFromMyView.connectedAccountId",
					"=",
					"receipts.ownerAccountId",
				),
		)
		.select((eb) => [
			"receipts.id",
			"receipts.createdAt",
			"receipts.name",
			"receipts.currencyCode",
			"receipts.ownerAccountId",
			"receipts.issued",
			"receiptOwnerFromMyView.id as ownerUserId",
			"meFromReceiptOwnerView.id as selfUserId",
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
									"receiptItemConsumers.userId",
									"receiptItemConsumers.createdAt",
								])
								.whereRef("receiptItemConsumers.itemId", "=", "receiptItems.id")
								.orderBy("receiptItemConsumers.createdAt", "desc")
								.orderBy("receiptItemConsumers.userId"),
						).as("consumers"),
					])
					.whereRef("receiptItems.receiptId", "=", "receipts.id")
					.orderBy("receiptItems.createdAt", "desc")
					.orderBy("receiptItems.id"),
			).as("items"),
			jsonArrayFrom(
				eb
					.selectFrom("receiptParticipants")
					.whereRef("receiptParticipants.receiptId", "=", "receipts.id")
					.innerJoin("users as usersTheir", (jb) =>
						jb.onRef("usersTheir.id", "=", "receiptParticipants.userId"),
					)
					.leftJoin("users as usersMine", (jb) =>
						jb
							.onRef(
								"usersMine.connectedAccountId",
								"=",
								"usersTheir.connectedAccountId",
							)
							.on("usersMine.ownerAccountId", "=", auth.accountId),
					)
					.select([
						"receiptParticipants.userId",
						"receiptParticipants.createdAt",
						"receiptParticipants.role",
					])
					.orderBy("receiptParticipants.createdAt", "desc")
					.orderBy("receiptParticipants.userId"),
			).as("participants"),
		])
		.execute();

const fetchDebts = async (
	{ database }: AuthorizedContext,
	receiptIds: ReceiptId[],
) =>
	database
		.selectFrom("debts")
		.innerJoin("users", (qb) => qb.onRef("users.id", "=", "debts.userId"))
		.where("debts.receiptId", "in", receiptIds)
		.select([
			"debts.id as debtId",
			"debts.receiptId",
			"debts.ownerAccountId",
			"users.id as userId",
		])
		.execute();

const getReceiptDebts = (
	debts: Awaited<ReturnType<typeof fetchDebts>>,
	receiptOwnerAccountId: AccountId,
	selfAccountId: AccountId,
	receiptSelfUserId: UserId,
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
			debts: { id: DebtId; userId: UserId }[];
	  } => {
	if (receiptOwnerAccountId === selfAccountId) {
		const outcomingDebt = debts
			.filter((debt) => debt.ownerAccountId === selfAccountId)
			.sort((a, b) => a.debtId.localeCompare(b.debtId))
			.map((debt) => ({ id: debt.debtId, userId: debt.userId }));
		return {
			direction: "outcoming",
			debts: outcomingDebt,
		};
	}
	const mineDebtId = debts.find(
		(debt) => debt.ownerAccountId === selfAccountId,
	)?.debtId;
	const foreignDebtId = debts.find(
		(debt) =>
			debt.ownerAccountId !== selfAccountId &&
			debt.userId === receiptSelfUserId,
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
	const { ownerAccountId, items, participants, ...receiptRest } = receipt;
	const payersItem = items.find((item) => item.id === receipt.id);
	const regularItems = items.filter((item) => item !== payersItem);
	return {
		...receiptRest,
		items: regularItems.map((item) => ({
			...item,
			price: Number(item.price),
			quantity: Number(item.quantity),
			consumers: item.consumers.map(({ part, ...consumer }) => ({
				...consumer,
				part: Number(part),
			})),
		})),
		participants: participants.map((participant) => ({
			...participant,
			role: participant.role as Role,
		})),
		debts: getReceiptDebts(
			debts,
			ownerAccountId,
			auth.accountId,
			receipt.selfUserId,
		),
		payers:
			payersItem?.consumers.map((payer) => ({
				...payer,
				part: Number(payer.part),
				// This can't happen as payers item always exists
				/* c8 ignore next */
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
			receipt.ownerUserId !== ctx.auth.accountId &&
			!receipt.participants.some(
				(participant) => participant.userId === receipt.selfUserId,
			)
		) {
			return new TRPCError({
				code: "FORBIDDEN",
				message: `Account "${ctx.auth.email}" has no access to receipt "${receipt.id}"`,
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
		} catch (e) {
			return e as Error;
		}
		/* c8 ignore stop */
	});
});

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptIdSchema,
		}),
	)
	.query(queueReceipt);
