import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { emailSchema, receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			targetEmail: emailSchema,
			receiptId: receiptIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		if (ctx.auth.email === input.targetEmail.lowercase) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Cannot transfer receipt to yourself`,
			});
		}
		const accountUserResult = await database
			.selectFrom("accounts")
			.where("accounts.email", "=", input.targetEmail.lowercase)
			.innerJoin("users", (qb) =>
				qb
					.on("users.ownerAccountId", "=", ctx.auth.accountId)
					.onRef("users.connectedAccountId", "=", "accounts.id"),
			)
			.select(["users.id as userId", "accounts.id"])
			.executeTakeFirst();
		if (!accountUserResult) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Account "${input.targetEmail.original}" does not exist or you don't have a user connected to it.`,
			});
		}
		const receiptUser = await database
			.selectFrom("receipts")
			.where("receipts.id", "=", input.receiptId)
			.where("receipts.ownerAccountId", "=", ctx.auth.accountId)
			.leftJoin("receiptParticipants", (qb) =>
				qb.onRef("receiptParticipants.receiptId", "=", "receipts.id"),
			)
			.leftJoin("users as usersParticipation", (qb) =>
				qb.onRef("usersParticipation.id", "=", "receiptParticipants.userId"),
			)
			.leftJoin("users as usersTransfer", (qb) =>
				qb
					.onRef(
						"usersTransfer.connectedAccountId",
						"=",
						"receipts.transferIntentionAccountId",
					)
					.onRef(
						"usersTransfer.ownerAccountId",
						"=",
						"receipts.ownerAccountId",
					),
			)
			.select([
				"receipts.ownerAccountId",
				"receipts.lockedTimestamp",
				"receipts.transferIntentionAccountId",
				"receiptParticipants.userId",
				"usersParticipation.name as userName",
				"usersTransfer.name as userTransferName",
			])
			.executeTakeFirst();
		if (!receiptUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist or you are not its owner.`,
			});
		}
		if (receiptUser.userId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Cannot send receipt transfer intention while having user "${receiptUser.userName}" added to it.`,
			});
		}
		if (receiptUser.lockedTimestamp) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Cannot send receipt transfer intention while receipt is locked.`,
			});
		}
		if (receiptUser.transferIntentionAccountId) {
			/* c8 ignore start */
			if (!receiptUser.userTransferName) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Expected to have transfer intention account user name, but did not find any.`,
				});
			}
			/* c8 ignore stop */
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `There is already a transfer intention to user "${receiptUser.userTransferName}".`,
			});
		}
		await database
			.updateTable("receipts")
			.where("receipts.id", "=", input.receiptId)
			.set({ transferIntentionAccountId: accountUserResult.id })
			.executeTakeFirst();
	});
