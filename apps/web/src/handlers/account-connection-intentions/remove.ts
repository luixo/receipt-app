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
			.selectFrom("users")
			.leftJoin("users as reciprocalUsers", (qb) =>
				qb
					.onRef(
						"reciprocalUsers.ownerAccountId",
						"=",
						"users.connectedAccountId",
					)
					.onRef(
						"reciprocalUsers.connectedAccountId",
						"=",
						"users.ownerAccountId",
					),
			)
			.select(["users.id"])
			.where((eb) =>
				eb.and({
					"users.ownerAccountId": ctx.auth.accountId,
					"users.connectedAccountId": input.targetAccountId,
				}),
			)
			.where("reciprocalUsers.id", "is", null)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention for account id "${input.targetAccountId}" not found.`,
			});
		}
		await database
			.updateTable("users")
			.set({ connectedAccountId: null })
			.where("id", "=", intention.id)
			.executeTakeFirst();
	});
