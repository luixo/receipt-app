import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptsId, UsersId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { getReceiptById } from "../receipts/utils";
import { getUserById } from "../users/utils";
import { flavored, role } from "../zod";
import { getReceiptParticipant } from "./utils";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		receiptId: z.string().uuid().refine<ReceiptsId>(flavored),
		userId: z.string().uuid().refine<UsersId>(flavored),
		role,
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
		await database
			.insertInto("receipt_participants")
			.values({
				receiptId: input.receiptId,
				userId: input.userId,
				role: input.role,
			})
			.executeTakeFirstOrThrow();
	},
});
