import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptsId, UsersId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { getReceiptById } from "../receipts/utils";
import { getUserById } from "../users/utils";
import { flavored } from "../zod";

import { getReceiptParticipant } from "./utils";

export const router = trpc.router<AuthorizedContext>().mutation("delete", {
	input: z.strictObject({
		receiptId: z.string().uuid().refine<ReceiptsId>(flavored),
		userId: z.string().uuid().refine<UsersId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Receipt ${input.receiptId} does not exist.`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add participants to receipt ${input.receiptId}.`,
			});
		}
		const user = await getUserById(database, input.userId, ["ownerAccountId"]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add user ${input.userId} to a receipt.`,
			});
		}
		const receiptParticipant = await getReceiptParticipant(
			database,
			input.userId,
			input.receiptId,
			["userId"]
		);
		if (!receiptParticipant) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not participate in receipt ${input.receiptId}.`,
			});
		}

		await database.transaction().execute(async (tx) => {
			await tx
				.deleteFrom("itemParticipants")
				.where("userId", "=", input.userId)
				.where("itemId", "in", (eb) =>
					eb
						.selectFrom("receiptItems")
						.where("receiptId", "=", input.receiptId)
						.select("id")
				)
				.executeTakeFirst();
			await tx
				.deleteFrom("receiptParticipants")
				.where("userId", "=", input.userId)
				.where("receiptId", "=", input.receiptId)
				.executeTakeFirst();
		});
	},
});
