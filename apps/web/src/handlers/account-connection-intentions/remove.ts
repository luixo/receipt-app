import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { accountIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Remove account connection intention",
		description:
			"Cancels an outbound account connection intention sent to a given targetAccountId.",
	})
	.input(
		z.strictObject({
			targetAccountId: accountIdSchema,
		}),
	)
	.mutation(async ({ ctx, input }) => {
		const { database } = ctx;
		const intention = await database
			.selectFrom("peers")
			.leftJoin("peers as reciprocalPeers", (qb) =>
				qb
					.onRef(
						"reciprocalPeers.ownerAccountId",
						"=",
						"peers.connectedAccountId",
					)
					.onRef(
						"reciprocalPeers.connectedAccountId",
						"=",
						"peers.ownerAccountId",
					),
			)
			.select(["peers.id"])
			.where((eb) =>
				eb.and({
					"peers.ownerAccountId": ctx.auth.accountId,
					"peers.connectedAccountId": input.targetAccountId,
				}),
			)
			.where("reciprocalPeers.id", "is", null)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention for account id "${input.targetAccountId}" not found.`,
			});
		}
		await database
			.updateTable("peers")
			.set({ connectedAccountId: null })
			.where("id", "=", intention.id)
			.executeTakeFirst();
	});
