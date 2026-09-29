import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AUTH_COOKIE } from "#app/utils/auth.ts";
import { confirmEmailTokenSchema } from "#app/utils/validation.ts";
import { createAuthorizationSession } from "#web/handlers/auth/utils.ts";
import { unauthProcedure } from "#web/handlers/trpc.ts";
import { setCookie } from "#web/utils/cookies.ts";

export const procedure = unauthProcedure
	.meta({
		title: "Confirm email",
		description:
			"Confirms an account's email using a confirmation token and logs the account in.",
	})
	.input(
		z.strictObject({
			token: confirmEmailTokenSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("users")
			.select(["id", "email"])
			.where("confirmationToken", "=", input.token)
			.limit(1)
			.executeTakeFirst();
		if (!account) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `There is no account with confirmation token "${input.token}".`,
			});
		}
		await database
			.updateTable("users")
			.set({ confirmationToken: null, confirmationTokenTimestamp: null })
			.where("users.id", "=", account.id)
			.executeTakeFirst();
		const { authToken, expirationDate } = await createAuthorizationSession(
			ctx,
			account.id,
		);
		setCookie(ctx, AUTH_COOKIE, authToken, { expires: expirationDate });
		return {
			email: account.email,
		};
	});
