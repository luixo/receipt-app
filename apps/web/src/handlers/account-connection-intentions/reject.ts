import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { accountIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Reject account connection intention",
		description:
			"Rejects an inbound account connection intention from a given sourceAccountId.",
	})
	.input(
		z.strictObject({
			sourceAccountId: accountIdSchema,
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
					"peers.ownerAccountId": input.sourceAccountId,
					"peers.connectedAccountId": ctx.auth.accountId,
				}),
			)
			.where("reciprocalPeers.id", "is", null)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention from account id "${input.sourceAccountId}" not found.`,
			});
		}
		await database
			.updateTable("peers")
			.set({ connectedAccountId: null })
			.where("id", "=", intention.id)
			.executeTakeFirst();
	});
