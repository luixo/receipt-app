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
					"users.ownerAccountId": input.sourceAccountId,
					"users.connectedAccountId": ctx.auth.accountId,
				}),
			)
			.where("reciprocalUsers.id", "is", null)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention from account id "${input.sourceAccountId}" not found.`,
			});
		}
		await database
			.updateTable("users")
			.set({ connectedAccountId: null })
			.where("id", "=", intention.id)
			.executeTakeFirst();
	});
