import { TRPCError } from "@trpc/server";
import type { Updateable } from "kysely";
import { z } from "zod";

import type { DB } from "~db/types.gen";
import { getReceiptParticipant } from "~web/handlers/receipt-participants/utils";
import { authProcedure } from "~web/handlers/trpc";
import {
	assignableRoleSchema,
	peerIdSchema,
	receiptIdSchema,
} from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Update receipt participant",
		description:
			"Updates the role of a peerId participating in a given receipt.",
	})
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			peerId: peerIdSchema,
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
		const peer = await database
			.selectFrom("peers")
			.select(["ownerAccountId", "connectedAccountId"])
			.where("id", "=", input.peerId)
			.limit(1)
			.executeTakeFirst();
		if (!peer) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${input.peerId}" does not exist.`,
			});
		}
		switch (input.update.type) {
			// We want this to blow up in case we add more cases
			// oxlint-disable-next-line typescript/no-unnecessary-condition
			case "role":
				if (receipt.ownerAccountId !== ctx.auth.accountId) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: `Only receipt owner can modify peer receipt role.`,
					});
				}
				if (input.peerId === ctx.auth.accountId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Cannot modify your own receipt role.`,
					});
				}
				break;
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
		let setObject: Updateable<DB["receiptParticipants"]> = {};
		switch (input.update.type) {
			// We want this to blow up in case we add more cases
			// oxlint-disable-next-line typescript/no-unnecessary-condition
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
					peerId: input.peerId,
				}),
			)
			.executeTakeFirst();
	});
