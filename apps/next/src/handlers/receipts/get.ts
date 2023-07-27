import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { DebtsId } from "next-app/db/models";
import { getAccessRole, Role } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

type DebtData = {
	id: DebtsId;
	type: "mine" | "foreign";
};

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptIdSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
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
					.on("usersMine.ownerAccountId", "=", ctx.auth.accountId)
					.onRef(
						"usersMine.connectedAccountId",
						"=",
						"receipts.ownerAccountId",
					),
			)
			.select([
				"receipts.id",
				"receipts.name",
				"currencyCode",
				sql<string>`coalesce(sum("receiptItems".price * "receiptItems".quantity), 0)`.as(
					"sum",
				),
				"receipts.ownerAccountId",
				"receipts.lockedTimestamp",
				"issued",
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
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `No receipt ${input.id} found`,
			});
		}
		const { ownerAccountId, lockedTimestamp, sum, ...receipt } = maybeReceipt;
		const accessRole = await getAccessRole(
			database,
			{ ownerAccountId, id: input.id },
			ctx.auth.accountId,
		);
		let debtData: DebtData | undefined;
		if (accessRole) {
			if (lockedTimestamp && ownerAccountId !== ctx.auth.accountId) {
				const mineDebt = await database
					.selectFrom("debts")
					.where("debts.receiptId", "=", input.id)
					.where("debts.ownerAccountId", "=", ctx.auth.accountId)
					.select("debts.id")
					.executeTakeFirst();
				if (mineDebt) {
					debtData = { type: "mine", id: mineDebt.id };
				} else {
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
						debtData = { type: "foreign", id: foreignDebt.id };
					}
				}
			}
			return {
				...receipt,
				sum: Number(sum),
				role: accessRole,
				lockedTimestamp: lockedTimestamp || undefined,
				debtData,
			} as typeof receipt & {
				role: Role;
				sum: number;
				lockedTimestamp?: Date;
				debtData?: DebtData;
			};
		}
		throw new trpc.TRPCError({
			code: "FORBIDDEN",
			message: `Account id ${ctx.auth.accountId} has no access to receipt ${receipt.id}`,
		});
	});
