import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { SimpleUpdateObject } from "~db/types";
import { getReceiptParticipant } from "~web/handlers/receipt-participants/utils";
import { authProcedure } from "~web/handlers/trpc";
import {
	assignableRoleSchema,
	receiptIdSchema,
	userIdSchema,
} from "~web/handlers/validation";

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
			]),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receipts")
			.select("ownerAccountId")
			.where("id", "=", input.receiptId)
			.limit(1)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist.`,
			});
		}
		const user = await database
			.selectFrom("users")
			.select(["ownerAccountId", "connectedAccountId"])
			.where("id", "=", input.userId)
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist.`,
			});
		}
		switch (input.update.type) {
			// We want this to blow up in case we add more cases
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			case "role":
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
				break;
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
			// We want this to blow up in case we add more cases
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			case "role":
				setObject = { role: input.update.role };
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
