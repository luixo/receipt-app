import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AUTH_COOKIE } from "~app/utils/auth";
import { confirmEmailTokenSchema } from "~app/utils/validation";
import { createAuthorizationSession } from "~web/handlers/auth/utils";
import { unauthProcedure } from "~web/handlers/trpc";
import { setCookie } from "~web/utils/cookies";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			token: confirmEmailTokenSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("accounts")
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
			.updateTable("accounts")
			.set({ confirmationToken: null, confirmationTokenTimestamp: null })
			.where("accounts.id", "=", account.id)
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
