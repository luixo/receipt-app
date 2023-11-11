import { TRPCError } from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import type { DebtsId } from "next-app/db/models";
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
				sql<string>`coalesce(sum("receiptItems".price * "receiptItems".quantity), 0)`.as(
					"sum",
				),
				"receipts.ownerAccountId",
				"receipts.lockedTimestamp",
				"receipts.issued",
				"receiptParticipants.resolved as participantResolved",
				"usersMine.id as ownerUserId",
				"usersTheir.id as selfUserId",
			])
			.groupBy([
				"receipts.id",
				"receiptParticipants.resolved",
				"usersMine.id",
				"usersTheir.id",
			])
			.executeTakeFirst();
		if (!maybeReceipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.id}" is not found.`,
			});
		}
		const { ownerAccountId, lockedTimestamp, sum, ...receipt } = maybeReceipt;
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
		const common = {
			...receipt,
			sum: Number(sum),
			role: accessRole,
		};
		type ReturnValue = typeof common & {
			debt?: ReceiptDebt;
			lockedTimestamp?: Date;
		};
		if (!lockedTimestamp) {
			return common as ReturnValue;
		}
		const commonLockedTimestamp: ReturnValue = {
			...receipt,
			sum: Number(sum),
			role: accessRole,
			lockedTimestamp,
		};
		if (ownerAccountId === ctx.auth.accountId) {
			const results = await database
				.selectFrom("debts")
				.where("debts.receiptId", "=", input.id)
				.where("debts.ownerAccountId", "=", ctx.auth.accountId)
				.select("debts.id")
				.orderBy("debts.id")
				.execute();
			if (results.length !== 0) {
				return {
					...commonLockedTimestamp,
					debt: {
						direction: "outcoming",
						ids: results.map(({ id }) => id),
					},
				} satisfies ReturnValue;
			}
			return commonLockedTimestamp;
		}
		const mineDebt = await database
			.selectFrom("debts")
			.where("debts.receiptId", "=", input.id)
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.select("debts.id")
			.executeTakeFirst();
		if (mineDebt) {
			return {
				...commonLockedTimestamp,
				debt: {
					direction: "incoming",
					type: "mine",
					id: mineDebt.id,
				},
			} satisfies ReturnValue;
		}
		const foreignDebt = await database
			.selectFrom("debts")
			.where("debts.receiptId", "=", input.id)
			.where("debts.ownerAccountId", "<>", ctx.auth.accountId)
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
				...commonLockedTimestamp,
				debt: {
					direction: "incoming",
					type: "foreign",
					id: foreignDebt.id,
				},
			} satisfies ReturnValue;
		}
		return commonLockedTimestamp;
	});
