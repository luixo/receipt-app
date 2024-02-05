import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { omitUndefined } from "app/utils/utils";
import type { DebtsId, UsersId } from "next-app/db/models";
import type { Role } from "next-app/handlers/receipts/utils";
import { getAccessRole } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

type ReceiptDebt =
	| {
			direction: "incoming";
			type: "mine" | "foreign";
			id: DebtsId;
	  }
	| {
			direction: "outcoming";
			ids: DebtsId[];
	  };

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptIdSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const maybeReceipt = await database
			.selectFrom("receipts")
			.where("receipts.id", "=", input.id)
			.leftJoin("users as usersTransferIntention", (jb) =>
				jb
					.on("usersTransferIntention.ownerAccountId", "=", ctx.auth.accountId)
					.onRef(
						"usersTransferIntention.connectedAccountId",
						"=",
						"receipts.transferIntentionAccountId",
					),
			)
			.innerJoin("users as usersTheir", (jb) =>
				jb
					.on("usersTheir.connectedAccountId", "=", ctx.auth.accountId)
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
					.onRef(
						"usersMine.ownerAccountId",
						"=",
						"usersTheir.connectedAccountId",
					)
					.onRef(
						"usersMine.connectedAccountId",
						"=",
						"receipts.ownerAccountId",
					),
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
				"usersMine.id as ownerUserId",
				"usersTheir.id as selfUserId",
				"receipts.transferIntentionAccountId",
				"usersTransferIntention.id as transferIntentionUserId",
			])
			.groupBy([
				"receipts.id",
				"receiptParticipants.resolved",
				"usersMine.id",
				"usersTheir.id",
				"receipts.transferIntentionAccountId",
				"transferIntentionUserId",
			])
			.executeTakeFirst();
		if (!maybeReceipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.id}" is not found.`,
			});
		}
		const {
			ownerAccountId,
			lockedTimestamp,
			sum,
			transferIntentionUserId,
			transferIntentionAccountId,
			...receipt
		} = maybeReceipt;
		const accessRole = await getAccessRole(
			database,
			{ ownerAccountId, id: input.id },
			ctx.auth.accountId,
		);
		if (!accessRole) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Account "${ctx.auth.email}" has no access to receipt "${receipt.id}"`,
			});
		}
		if (
			transferIntentionAccountId &&
			ownerAccountId === ctx.auth.accountId &&
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
		type Receipt = typeof receipt & {
			sum: number;
			role: Role;
			transferIntentionUserId?: UsersId;
		};
		const common: Receipt = omitUndefined({
			...receipt,
			sum: Number(sum),
			role: accessRole,
			transferIntentionUserId:
				transferIntentionAccountId && ownerAccountId === ctx.auth.accountId
					? transferIntentionUserId!
					: undefined,
		});
		type ReceiptWithTimestamp = Receipt & {
			debt?: ReceiptDebt;
			lockedTimestamp?: Date;
		};
		if (!lockedTimestamp) {
			return common as ReceiptWithTimestamp;
		}
		const commonWithTimestamp: ReceiptWithTimestamp = {
			...common,
			lockedTimestamp,
		};
		if (ownerAccountId === ctx.auth.accountId) {
			const results = await database
				.selectFrom("debts")
				.where((eb) =>
					eb.and({
						receiptId: input.id,
						ownerAccountId: ctx.auth.accountId,
					}),
				)
				.select("debts.id")
				.orderBy("debts.id")
				.execute();
			if (results.length !== 0) {
				return {
					...commonWithTimestamp,
					debt: {
						direction: "outcoming",
						ids: results.map(({ id }) => id),
					},
				} satisfies ReceiptWithTimestamp;
			}
			return commonWithTimestamp;
		}
		const mineDebt = await database
			.selectFrom("debts")
			.where((eb) =>
				eb.and({
					receiptId: input.id,
					ownerAccountId: ctx.auth.accountId,
				}),
			)
			.select("debts.id")
			.executeTakeFirst();
		if (mineDebt) {
			return {
				...commonWithTimestamp,
				debt: {
					direction: "incoming",
					type: "mine",
					id: mineDebt.id,
				},
			} satisfies ReceiptWithTimestamp;
		}
		const foreignDebt = await database
			.selectFrom("debts")
			.where((eb) =>
				eb("debts.receiptId", "=", input.id).and(
					"debts.ownerAccountId",
					"<>",
					ctx.auth.accountId,
				),
			)
			.innerJoin("users as usersTheir", (qb) =>
				qb
					.onRef("usersTheir.id", "=", "debts.userId")
					.on("usersTheir.connectedAccountId", "=", ctx.auth.accountId),
			)
			.whereRef("debts.userId", "=", "usersTheir.id")
			.select("debts.id")
			.executeTakeFirst();
		if (foreignDebt) {
			return {
				...commonWithTimestamp,
				debt: {
					direction: "incoming",
					type: "foreign",
					id: foreignDebt.id,
				},
			} satisfies ReceiptWithTimestamp;
		}
		return commonWithTimestamp;
	});
