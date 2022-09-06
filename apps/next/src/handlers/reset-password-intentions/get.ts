import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { unauthProcedure } from "next-app/handlers/trpc";
import { resetPasswordTokenSchema } from "next-app/handlers/validation";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			token: resetPasswordTokenSchema,
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const resetPasswordIntention = await database
			.selectFrom("resetPasswordIntentions")
			.where("token", "=", input.token)
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "resetPasswordIntentions.accountId")
			)
			.select("email")
			.executeTakeFirst();
		if (!resetPasswordIntention) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Reset password intention ${input.token} does not exist.`,
			});
		}
		return {
			email: resetPasswordIntention.email,
		};
	});
