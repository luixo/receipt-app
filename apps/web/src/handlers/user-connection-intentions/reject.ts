import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Reject  user connection intention",
		description:
			"Rejects an inbound  user connection intention from a given sourceUserId.",
	})
	.input(
		z.strictObject({
			sourceUserId: userIdSchema,
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
					"peers.ownerUserId": input.sourceUserId,
					"peers.connectedUserId": ctx.auth.userId,
				}),
			)
			.where("reciprocalPeers.id", "is", null)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention from  user id "${input.sourceUserId}" not found.`,
			});
		}
		await database
			.updateTable("peers")
			.set({ connectedUserId: null })
			.where("id", "=", intention.id)
			.executeTakeFirst();
	});
