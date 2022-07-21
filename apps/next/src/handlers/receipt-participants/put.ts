import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getReceiptParticipant } from "next-app/handlers/receipt-participants/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { getUserById } from "next-app/handlers/users/utils";
import {
	receiptIdSchema,
	roleSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		receiptId: receiptIdSchema,
		userId: userIdSchema,
		role: roleSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `Receipt ${input.receiptId} does not exist.`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add participants to receipt ${input.receiptId}.`,
			});
		}
		if (input.userId === ctx.auth.accountId && input.role !== "owner") {
			throw new trpc.TRPCError({
				code: "BAD_REQUEST",
				message: `Cannot add yourself as not an owner.`,
			});
		}
		if (input.userId !== ctx.auth.accountId && input.role === "owner") {
			throw new trpc.TRPCError({
				code: "BAD_REQUEST",
				message: `Cannot add ${input.userId} as an owner.`,
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
		if (receiptParticipant) {
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: `User ${input.userId} already participates in receipt ${input.receiptId}.`,
			});
		}
		const result = await database
			.insertInto("receiptParticipants")
			.values({
				receiptId: input.receiptId,
				userId: input.userId,
				role: input.role,
			})
			.returning("added")
			.executeTakeFirstOrThrow();
		return {
			added: result.added,
		};
	},
});
