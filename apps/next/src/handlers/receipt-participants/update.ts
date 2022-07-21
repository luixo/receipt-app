import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import { ReceiptsDatabase, getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getReceiptParticipant } from "next-app/handlers/receipt-participants/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { getUserById } from "next-app/handlers/users/utils";
import {
	assignableRoleSchema,
	receiptIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("update", {
	input: z.strictObject({
		receiptId: receiptIdSchema,
		userId: userIdSchema,
		update: z.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("role"),
				role: assignableRoleSchema,
			}),
			z.strictObject({ type: z.literal("resolved"), resolved: z.boolean() }),
		]),
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
		if (input.update.type === "role") {
			if (receipt.ownerAccountId !== ctx.auth.accountId) {
				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `Not enough rights to modify role on receipt ${input.receiptId}.`,
				});
			}
			if (input.userId === ctx.auth.accountId) {
				throw new trpc.TRPCError({
					code: "BAD_REQUEST",
					message: `Cannot modify your own receipt role.`,
				});
			}
		} else if (input.update.type === "resolved") {
			const user = await getUserById(database, input.userId, [
				"ownerAccountId",
				"connectedAccountId",
			]);
			if (!user) {
				throw new trpc.TRPCError({
					code: "NOT_FOUND",
					message: `User ${input.userId} does not exist.`,
				});
			}
			if (user.connectedAccountId !== ctx.auth.accountId) {
				throw new trpc.TRPCError({
					code: "FORBIDDEN",
					message: `Not enough rights to modify resolved on user ${input.userId}.`,
				});
			}
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
		let setObject: MutationObject<
			ReceiptsDatabase,
			"receiptParticipants",
			"receiptParticipants"
		> = {};
		switch (input.update.type) {
			case "role":
				setObject = { role: input.update.role };
				break;
			case "resolved":
				setObject = { resolved: input.update.resolved };
				break;
		}
		await database
			.updateTable("receiptParticipants")
			.set(setObject)
			.where("receiptId", "=", input.receiptId)
			.where("userId", "=", input.userId)
			.executeTakeFirst();
	},
});
