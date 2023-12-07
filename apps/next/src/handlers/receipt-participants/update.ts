import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { SimpleUpdateObject } from "next-app/db/types";
import { getReceiptParticipant } from "next-app/handlers/receipt-participants/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
import {
	assignableRoleSchema,
	receiptIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
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
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist.`,
			});
		}
		const user = await getUserById(database, input.userId, [
			"ownerAccountId",
			"connectedAccountId",
		]);
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist.`,
			});
		}
		if (input.update.type === "role") {
			if (receipt.ownerAccountId !== ctx.auth.accountId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Only receipt owner can modify user receipt role.`,
				});
			}
			if (input.userId === ctx.auth.accountId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Cannot modify your own receipt role.`,
				});
			}
		} else if (input.update.type === "resolved") {
			if (user.connectedAccountId !== ctx.auth.accountId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `You can modify only your own "resolved" status.`,
				});
			}
		}
		const receiptParticipant = await getReceiptParticipant(
			database,
			input.userId,
			input.receiptId,
			["userId"],
		);
		if (!receiptParticipant) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `User "${input.userId}" does not participate in receipt "${input.receiptId}".`,
			});
		}
		let setObject: SimpleUpdateObject<"receiptParticipants"> = {};
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
			.where((eb) =>
				eb.and({
					receiptId: input.receiptId,
					userId: input.userId,
				}),
			)
			.executeTakeFirst();
	});
