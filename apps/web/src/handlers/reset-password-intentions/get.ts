import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { resetPasswordTokenSchema } from "~app/utils/validation";
import { getNow } from "~utils/date";
import { unauthProcedure } from "~web/handlers/trpc";

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
			.where((eb) =>
				eb("token", "=", input.token).and("expiresTimestamp", ">", getNow()),
			)
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "resetPasswordIntentions.accountId"),
			)
			.select("email")
			.limit(1)
			.executeTakeFirst();
		if (!resetPasswordIntention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Reset password intention "${input.token}" does not exist or expired.`,
			});
		}
		return {
			email: resetPasswordIntention.email,
		};
	});
