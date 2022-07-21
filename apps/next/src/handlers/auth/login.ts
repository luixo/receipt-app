import * as trpc from "@trpc/server";
import { z } from "zod";

import { emailSchema, passwordSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { createAuthorizationSession } from "next-app/handlers/auth/utils";
import { UnauthorizedContext } from "next-app/handlers/context";
import { setAuthCookie } from "next-app/utils/auth-cookie";
import { getHash } from "next-app/utils/crypto";

export const router = trpc.router<UnauthorizedContext>().mutation("login", {
	input: z.strictObject({
		email: emailSchema,
		password: passwordSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const email = input.email.toLowerCase();
		const database = getDatabase(ctx);
		const account = await database
			.selectFrom("accounts")
			.select(["id", "email", "passwordSalt", "passwordHash"])
			.where("email", "=", input.email)
			.executeTakeFirst();

		if (!account) {
			ctx.logger.debug(
				`Authorization of account "${email}" failed: account not found.`
			);
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Authorization of account "${email}" failed: account not found.`,
			});
		} else {
			const isPasswordValid =
				getHash(input.password, account.passwordSalt) === account.passwordHash;
			if (!isPasswordValid) {
				ctx.logger.debug(
					`Authorization of account "${email}" failed: wrong password.`
				);
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: `Authentication of account "${email}" failed.`,
				});
			} else {
				const { authToken, expirationDate } = await createAuthorizationSession(
					database,
					account.id
				);
				ctx.logger.debug(`Authorization of account "${email}" succeed.`);
				setAuthCookie(ctx.res, authToken, expirationDate);
				return {
					expirationTimestamp: expirationDate.valueOf(),
					accountId: account.id,
					email: account.email,
				};
			}
		}
	},
});
