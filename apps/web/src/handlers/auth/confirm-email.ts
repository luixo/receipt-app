import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AUTH_COOKIE } from "~app/utils/auth";
import { confirmEmailTokenSchema } from "~app/utils/validation";
import { createAuthorizationSession } from "~web/handlers/auth/utils";
import { unauthProcedure } from "~web/handlers/trpc";
import { setCookie } from "~web/utils/cookies";

export const procedure = unauthProcedure
	.meta({
		title: "Confirm email",
		description:
			"Confirms an user's email using a confirmation token and logs the user in.",
	})
	.input(
		z.strictObject({
			token: confirmEmailTokenSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.select(["id", "email"])
			.where("confirmationToken", "=", input.token)
			.limit(1)
			.executeTakeFirst();
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `There is no user with confirmation token "${input.token}".`,
			});
		}
		await database
			.updateTable("users")
			.set({ confirmationToken: null, confirmationTokenTimestamp: null })
			.where("users.id", "=", user.id)
			.executeTakeFirst();
		const { authToken, expirationDate } = await createAuthorizationSession(
			ctx,
			user.id,
		);
		setCookie(ctx, AUTH_COOKIE, authToken, { expires: expirationDate });
		return {
			email: user.email,
		};
	});
