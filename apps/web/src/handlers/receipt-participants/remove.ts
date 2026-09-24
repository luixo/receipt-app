import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getReceiptParticipant } from "~web/handlers/receipt-participants/utils";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema, receiptIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Remove receipt participant",
		description:
			"Removes a peerId as a participant of a given receipt, along with their item consumptions.",
	})
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			peerId: peerIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receipts")
			.select(["ownerUserId"])
			.where("id", "=", input.receiptId)
			.limit(1)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist.`,
			});
		}
		if (receipt.ownerUserId !== ctx.auth.userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to remove participant from receipt "${input.receiptId}".`,
			});
		}
		const peer = await database
			.selectFrom("peers")
			.select("ownerUserId")
			.where("id", "=", input.peerId)
			.limit(1)
			.executeTakeFirst();
		if (!peer) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${input.peerId}" does not exist.`,
			});
		}
		if (peer.ownerUserId !== ctx.auth.userId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Peer "${input.peerId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		const receiptParticipant = await getReceiptParticipant(
			database,
			input.peerId,
			input.receiptId,
			["peerId"],
		);
		if (!receiptParticipant) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Peer "${input.peerId}" does not participate in receipt "${input.receiptId}".`,
			});
		}
		await database.transaction().execute(async (tx) => {
			await tx
				.deleteFrom("receiptItemConsumers")
				.where((eb) =>
					eb("peerId", "=", input.peerId).and("itemId", "in", (ebb) =>
						ebb
							.selectFrom("receiptItems")
							.where("receiptId", "=", input.receiptId)
							.select("id"),
					),
				)

				.executeTakeFirst();
			await tx
				.deleteFrom("receiptParticipants")
				.where((eb) =>
					eb.and({
						receiptId: input.receiptId,
						peerId: input.peerId,
					}),
				)
				.executeTakeFirst();
		});
	});
