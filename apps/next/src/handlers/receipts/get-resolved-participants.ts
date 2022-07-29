import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import { receiptIdSchema } from "next-app/handlers/validation";

export const router = trpc
	.router<AuthorizedContext>()
	.query("get-resolved-participants", {
		input: z.strictObject({
			receiptId: receiptIdSchema,
		}),
		resolve: async ({ input, ctx }) => {
			const database = getDatabase(ctx);
			const receipt = await getReceiptById(database, input.receiptId, [
				"id",
				"ownerAccountId",
			]);
			if (!receipt) {
				throw new trpc.TRPCError({
					code: "NOT_FOUND",
					message: `Receipt ${input.receiptId} does not exist.`,
				});
			}
			const accessRole = await getAccessRole(
				database,
				receipt,
				ctx.auth.accountId
			);
			if (!accessRole) {
				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `Account id ${ctx.auth.accountId} has no access to receipt ${receipt.id}`,
				});
			}
			const participants = await database
				.selectFrom("receiptParticipants")
				.where("receiptId", "=", input.receiptId)
				.innerJoin("users as usersTheir", (jb) =>
					jb.onRef("usersTheir.id", "=", "receiptParticipants.userId")
				)
				.leftJoin("users as usersMine", (jb) =>
					jb
						.onRef(
							"usersMine.connectedAccountId",
							"=",
							"usersTheir.connectedAccountId"
						)
						.on("usersMine.ownerAccountId", "=", ctx.auth.accountId)
				)
				.select([
					"receiptParticipants.userId as remoteUserId",
					"receiptParticipants.resolved",
					"usersMine.id as localUserId",
				])
				.execute();
			return participants;
		},
	});
