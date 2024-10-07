import { TRPCError } from "@trpc/server";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod";

import type { AccountsId, DebtsId, ReceiptsId, UsersId } from "~db/models";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import type { Role } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { receiptIdSchema } from "~web/handlers/validation";

const fetchReceipts = async (
	{ database, auth }: AuthorizedContext,
	ids: ReceiptsId[],
) =>
	database
		.selectFrom("receipts")
		.where("receipts.id", "in", ids)
		.leftJoin("users as usersTransferIntention", (jb) =>
			jb
				.on("usersTransferIntention.ownerAccountId", "=", auth.accountId)
				.onRef(
					"usersTransferIntention.connectedAccountId",
					"=",
					"receipts.transferIntentionAccountId",
				),
		)
		.innerJoin("users as usersTheir", (jb) =>
			jb
				.on("usersTheir.connectedAccountId", "=", auth.accountId)
				.onRef("usersTheir.ownerAccountId", "=", "receipts.ownerAccountId"),
		)
		.innerJoin("users as usersMine", (jb) =>
			jb
				.onRef("usersMine.ownerAccountId", "=", "usersTheir.connectedAccountId")
				.onRef("usersMine.connectedAccountId", "=", "receipts.ownerAccountId"),
		)
		.select((eb) => [
			"receipts.id",
			"receipts.name",
			"receipts.currencyCode",
			"receipts.ownerAccountId",
			"receipts.issued",
			"receipts.transferIntentionAccountId",
			"usersMine.id as ownerUserId",
			"usersTheir.id as selfUserId",
			"usersTransferIntention.id as transferIntentionUserId",
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
								.selectFrom("itemParticipants")
								.select(["itemParticipants.part", "itemParticipants.userId"])
								.whereRef("itemParticipants.itemId", "=", "receiptItems.id")
								.orderBy("itemParticipants.userId desc"),
						).as("parts"),
					])
					.whereRef("receiptItems.receiptId", "=", "receipts.id")
					.orderBy(["receiptItems.createdAt desc", "receiptItems.id"]),
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
						"receiptParticipants.resolved",
						"receiptParticipants.createdAt",
						"receiptParticipants.role",
					])
					.orderBy("receiptParticipants.userId"),
			).as("participants"),
		])
		.execute();

const fetchDebts = async (
	{ database }: AuthorizedContext,
	receiptIds: ReceiptsId[],
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

const getReceiptDebt = (
	debts: Awaited<ReturnType<typeof fetchDebts>>,
	receiptOwnerAccountId: AccountsId,
	selfAccountId: AccountsId,
	receiptSelfUserId: UsersId,
):
	| ({
			direction: "incoming";
	  } & (
			| { id: DebtsId; hasMine: true; hasForeign: boolean }
			| { id: DebtsId; hasMine: false; hasForeign: true }
			| { id: undefined; hasMine: false; hasForeign: false }
	  ))
	| {
			direction: "outcoming";
			ids: DebtsId[];
	  } => {
	if (receiptOwnerAccountId === selfAccountId) {
		const outcomingDebtIds = debts
			.filter((debt) => debt.ownerAccountId === selfAccountId)
			.sort((a, b) => a.debtId.localeCompare(b.debtId))
			.map((debt) => debt.debtId);
		return {
			direction: "outcoming",
			ids: outcomingDebtIds,
		};
	}
	const mineDebtId = debts.find((debt) => debt.ownerAccountId === selfAccountId)
		?.debtId;
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
	const {
		ownerAccountId,
		transferIntentionUserId,
		transferIntentionAccountId,
		items,
		participants,
		...receiptRest
	} = receipt;
	if (
		transferIntentionAccountId &&
		ownerAccountId === auth.accountId &&
		!transferIntentionUserId
		/* c8 ignore start */
	) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message:
				"Expected to have transfer user id being an owner of a receipt with transfer intention",
		});
	}
	/* c8 ignore stop */
	return {
		...receiptRest,
		items: items.map((item) => ({
			...item,
			createdAt: new Date(item.createdAt),
			price: Number(item.price),
			quantity: Number(item.quantity),
			parts: item.parts
				.map((part) => ({
					...part,
					part: Number(part.part),
				}))
				.sort((a, b) => a.userId.localeCompare(b.userId)),
		})),
		participants: participants.map((participant) => ({
			...participant,
			createdAt: new Date(participant.createdAt),
			role: participant.role as Role,
		})),
		transferIntentionUserId:
			transferIntentionAccountId !== null &&
			transferIntentionUserId !== null &&
			ownerAccountId === auth.accountId
				? transferIntentionUserId
				: undefined,
		debt: getReceiptDebt(
			debts,
			ownerAccountId,
			auth.accountId,
			receipt.selfUserId,
		),
	};
};

type Receipt = ReturnType<typeof mapReceipt>;

const queueReceipt = queueCallFactory<
	AuthorizedContext,
	{ id: ReceiptsId },
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
			!receipt.participants.find(
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
