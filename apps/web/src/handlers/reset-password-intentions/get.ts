// Better Auth persists verification expiry as a native Date.
// oxlint-disable eslint-js/no-restricted-syntax

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { resetPasswordTokenSchema } from "~app/utils/validation";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Get reset password intention",
		description:
			"Returns the user email for a valid, unexpired reset password token.",
	})
	.input(
		z.strictObject({
			token: resetPasswordTokenSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const intention = await ctx.authDatabase
			.selectFrom("auth.verification")
			.select(["auth.verification.value"])
			.where(
				"auth.verification.identifier",
				"=",
				`reset-password:${input.token}`,
			)
			.where("auth.verification.expiresAt", ">", new Date())
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Reset password intention "${input.token}" does not exist or expired.`,
			});
		}
		const user = await ctx.authDatabase
			.selectFrom("auth.user")
			.select("email")
			.where("id", "=", intention.value)
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Reset password intention "${input.token}" does not exist or expired.`,
			});
		}
		return {
			email: user.email,
		};
	});
