import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getAccessRole } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receipts")
			.select(["id", "ownerAccountId"])
			.where("id", "=", input.receiptId)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" is not found.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId,
		);
		if (!accessRole) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Account "${ctx.auth.email}" has no access to receipt "${receipt.id}"`,
			});
		}
		const participants = await database
			.selectFrom("receiptParticipants")
			.where("receiptId", "=", input.receiptId)
			.innerJoin("users as usersTheir", (jb) =>
				jb.onRef("usersTheir.id", "=", "receiptParticipants.userId"),
			)
			.leftJoin("users as usersMine", (jb) =>
				jb
					.onRef(
						"usersMine.connectedAccountId",
						"=",
						"usersTheir.connectedAccountId",
					)
					.on("usersMine.ownerAccountId", "=", ctx.auth.accountId),
			)
			.select([
				"receiptParticipants.userId as remoteUserId",
				"receiptParticipants.resolved",
				"usersMine.id as localUserId",
				"usersTheir.ownerAccountId",
			])
			.orderBy(["receiptParticipants.userId", "usersMine.id"])
			.execute();
		return participants.map(({ ownerAccountId, ...participant }) => ({
			...participant,
			localUserId:
				ownerAccountId === ctx.auth.accountId
					? participant.remoteUserId
					: participant.localUserId,
		}));
	});
