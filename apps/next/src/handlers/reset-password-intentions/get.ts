import * as trpc from "@trpc/server";
import { z } from "zod";

import { unauthProcedure } from "next-app/handlers/trpc";
import { resetPasswordTokenSchema } from "next-app/handlers/validation";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			token: resetPasswordTokenSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const resetPasswordIntention = await database
			.selectFrom("resetPasswordIntentions")
			.where("token", "=", input.token)
			.where("expiresTimestamp", ">", new Date())
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "resetPasswordIntentions.accountId"),
			)
			.select("email")
			.executeTakeFirst();
		if (!resetPasswordIntention) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Reset password intention ${input.token} does not exist or expired.`,
			});
		}
		return {
			email: resetPasswordIntention.email,
		};
	});
