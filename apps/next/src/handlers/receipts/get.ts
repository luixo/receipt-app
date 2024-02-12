import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { omitUndefined } from "app/utils/utils";
import type {
	AccountsId,
	DebtsId,
	ReceiptsId,
	UsersId,
} from "next-app/db/models";
import { queueCallFactory } from "next-app/handlers/batch";
import type { AuthorizedContext } from "next-app/handlers/context";
import type { Role } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema, roleSchema } from "next-app/handlers/validation";

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
		.leftJoin("receiptItems", (jb) =>
			jb.onRef("receiptItems.receiptId", "=", "receipts.id"),
		)
		.leftJoin("receiptParticipants", (jb) =>
			jb
				.onRef("receiptParticipants.receiptId", "=", "receipts.id")
				.onRef("receiptParticipants.userId", "=", "usersTheir.id"),
		)
		.innerJoin("users as usersMine", (jb) =>
			jb
				.onRef("usersMine.ownerAccountId", "=", "usersTheir.connectedAccountId")
				.onRef("usersMine.connectedAccountId", "=", "receipts.ownerAccountId"),
		)
		.select([
			"receipts.id",
			"receipts.name",
			"receipts.currencyCode",
			(eb) =>
				eb.fn
					.coalesce(
						eb.fn.sum(
							eb("receiptItems.price", "*", eb.ref("receiptItems.quantity")),
						),
						sql`0`,
					)
					.as("sum"),
			"receipts.ownerAccountId",
			"receipts.lockedTimestamp",
			"receipts.issued",
			"receiptParticipants.resolved as participantResolved",
			"receiptParticipants.role as selfRole",
			"usersMine.id as ownerUserId",
			"usersTheir.id as selfUserId",
			"receipts.transferIntentionAccountId",
			"usersTransferIntention.id as transferIntentionUserId",
		])
		.groupBy([
			"receipts.id",
			"receiptParticipants.resolved",
			"receiptParticipants.role",
			"usersMine.id",
			"usersTheir.id",
			"receipts.transferIntentionAccountId",
			"transferIntentionUserId",
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

const getAccessRole = (
	selfRole: string | null,
	receiptOwnerAccountId: AccountsId,
	selfAccountId: AccountsId,
	selfEmail: string,
	receiptId: ReceiptsId,
): Role => {
	if (receiptOwnerAccountId === selfAccountId) {
		return "owner" as const;
	}
	const parsed = roleSchema.safeParse(selfRole);
	if (!parsed.success) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Account "${selfEmail}" has no access to receipt "${receiptId}"`,
		});
	}
	return parsed.data;
};

const getReceiptDebt = (
	debts: Awaited<ReturnType<typeof fetchDebts>>,
	receiptOwnerAccountId: AccountsId,
	selfAccountId: AccountsId,
	receiptSelfUserId: UsersId,
):
	| {
			direction: "incoming";
			type: "mine" | "foreign";
			id: DebtsId;
	  }
	| {
			direction: "outcoming";
			ids: DebtsId[];
	  }
	| undefined => {
	if (receiptOwnerAccountId === selfAccountId) {
		const outcomingDebtIds = debts
			.filter((debt) => debt.ownerAccountId === selfAccountId)
			.sort((a, b) => a.debtId.localeCompare(b.debtId))
			.map((debt) => debt.debtId);
		if (outcomingDebtIds.length !== 0) {
			return {
				direction: "outcoming",
				ids: outcomingDebtIds,
			};
		}
		return;
	}
	const mineDebtId = debts.find((debt) => debt.ownerAccountId === selfAccountId)
		?.debtId;
	if (mineDebtId) {
		return {
			direction: "incoming",
			type: "mine",
			id: mineDebtId,
		};
	}
	const foreignDebtId = debts.find(
		(debt) =>
			debt.ownerAccountId !== selfAccountId &&
			debt.userId === receiptSelfUserId,
	)?.debtId;
	if (foreignDebtId) {
		return {
			direction: "incoming",
			type: "foreign",
			id: foreignDebtId,
		};
	}
};

const mapReceipt = (
	auth: AuthorizedContext["auth"],
	receipt: Awaited<ReturnType<typeof fetchReceipts>>[number],
	debts: Awaited<ReturnType<typeof fetchDebts>>,
) => {
	const {
		ownerAccountId,
		lockedTimestamp,
		sum,
		transferIntentionUserId,
		transferIntentionAccountId,
		selfRole,
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
	const common = omitUndefined({
		...receiptRest,
		sum: Number(sum),
		role: getAccessRole(
			selfRole,
			ownerAccountId,
			auth.accountId,
			auth.email,
			receipt.id,
		),
		transferIntentionUserId:
			transferIntentionAccountId && ownerAccountId === auth.accountId
				? transferIntentionUserId!
				: undefined,
	});
	type Receipt = Omit<typeof common, "transferIntentionUserId"> & {
		debt?: ReturnType<typeof getReceiptDebt>;
		lockedTimestamp?: Date;
		transferIntentionUserId?: UsersId;
	};
	if (!lockedTimestamp) {
		return common as Receipt;
	}
	return omitUndefined({
		...common,
		lockedTimestamp,
		debt: getReceiptDebt(
			debts,
			ownerAccountId,
			auth.accountId,
			receipt.selfUserId,
		),
	}) satisfies Receipt;
};

type Receipt = ReturnType<typeof mapReceipt>;
type DatabaseReceipt = Awaited<ReturnType<typeof fetchReceipts>>[number];
type DatabaseDebt = Awaited<ReturnType<typeof fetchDebts>>[number];

const queueReceipt = queueCallFactory<
	AuthorizedContext,
	{ id: ReceiptsId },
	Receipt,
	[DatabaseReceipt[], DatabaseDebt[]]
>(
	async (ctx, inputs) => {
		const receiptIds = inputs.map(({ id }) => id);
		return Promise.all([
			fetchReceipts(ctx, receiptIds),
			fetchDebts(ctx, receiptIds),
		]);
	},
	async (ctx, input, [receipts, debts]) => {
		const receipt = receipts.find(({ id }) => id === input.id);
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.id}" is not found.`,
			});
		}
		return mapReceipt(
			ctx.auth,
			receipt,
			debts.filter((debt) => debt.receiptId === receipt.id),
		);
	},
);

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptIdSchema,
		}),
	)
	.query(queueReceipt);
