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
		const result = await database
			.selectFrom("accounts")
			.where("email", "=", input.email)
			.innerJoin("users", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accounts.id")
			)
			.select([
				"accounts.id as accountId",
				"email",
				"passwordSalt",
				"passwordHash",
				"users.name",
			])
			.executeTakeFirst();

		if (!result) {
			ctx.logger.debug(
				`Authorization of account "${email}" failed: account not found.`
			);
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Authorization of account "${email}" failed: account not found.`,
			});
		} else {
			const isPasswordValid =
				getHash(input.password, result.passwordSalt) === result.passwordHash;
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
					result.accountId
				);
				ctx.logger.debug(`Authorization of account "${email}" succeed.`);
				setAuthCookie(ctx.res, authToken, expirationDate);
				return {
					accountId: result.accountId,
					name: result.name,
				};
			}
		}
	},
});
