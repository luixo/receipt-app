import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Remove  user connection intention",
		description:
			"Cancels an outbound  user connection intention sent to a given targetUserId.",
	})
	.input(
		z.strictObject({
			targetUserId: userIdSchema,
		}),
	)
	.mutation(async ({ ctx, input }) => {
		const { database } = ctx;
		const intention = await database
			.selectFrom("peers")
			.leftJoin("peers as reciprocalPeers", (qb) =>
				qb
					.onRef("reciprocalPeers.ownerUserId", "=", "peers.connectedUserId")
					.onRef("reciprocalPeers.connectedUserId", "=", "peers.ownerUserId"),
			)
			.select(["peers.id"])
			.where((eb) =>
				eb.and({
					"peers.ownerUserId": ctx.auth.userId,
					"peers.connectedUserId": input.targetUserId,
				}),
			)
			.where("reciprocalPeers.id", "is", null)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention for  user id "${input.targetUserId}" not found.`,
			});
		}
		await database
			.updateTable("peers")
			.set({ connectedUserId: null })
			.where("id", "=", intention.id)
			.executeTakeFirst();
	});
