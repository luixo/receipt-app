import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import {
	receiptIdSchema,
	assignableRoleSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		receiptId: receiptIdSchema,
		userIds: z.array(userIdSchema).nonempty(),
		role: assignableRoleSchema,
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
		const users = await database
			.selectFrom("users")
			.select(["id", "ownerAccountId"])
			.where("id", "in", input.userIds)
			.execute();
		if (users.length !== input.userIds.length) {
			const missedUserIds = input.userIds.filter(
				(userId) => !users.some((user) => user.id === userId)
			);
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User(s) ${missedUserIds.join(", ")} do(es) not exist.`,
			});
		}
		const notOwnedUsers = users.filter(
			(user) => user.ownerAccountId !== ctx.auth.accountId
		);
		if (notOwnedUsers.length !== 0) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add user(s) ${notOwnedUsers
					.map(({ id }) => id)
					.join(", ")} to a receipt.`,
			});
		}
		const receiptParticipants = await database
			.selectFrom("receiptParticipants")
			.where("receiptId", "=", input.receiptId)
			.where("userId", "in", input.userIds)
			.select(["userId"])
			.execute();
		if (receiptParticipants.length !== 0) {
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: `User(s) ${receiptParticipants.map(
					({ userId }) => userId
				)} already participate(s) in receipt ${input.receiptId}.`,
			});
		}
		const result = await database
			.insertInto("receiptParticipants")
			.values(
				input.userIds.map((userId) => ({
					receiptId: input.receiptId,
					userId,
					role: ctx.auth.accountId === userId ? "owner" : input.role,
				}))
			)
			.returning("added")
			.execute();
		return {
			added: result.map(({ added }) => added),
		};
	},
});
