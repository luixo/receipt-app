import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getAccessRole, Role } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

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
		if (accessRole) {
			return {
				...receipt,
				sum: Number(sum),
				role: accessRole,
				lockedTimestamp: lockedTimestamp || undefined,
			} as typeof receipt & {
				role: Role;
				sum: number;
				lockedTimestamp?: Date;
			};
		}
		throw new trpc.TRPCError({
			code: "FORBIDDEN",
			message: `Account id ${ctx.auth.accountId} has no access to receipt ${receipt.id}`,
		});
	});
