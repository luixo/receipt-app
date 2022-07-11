import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { setAuthCookie } from "../../utils/auth-cookie";
import { getHash } from "../../utils/crypto";
import { UnauthorizedContext } from "../context";
import { password } from "../zod";

import { createAuthorizationSession } from "./utils";

export const router = trpc.router<UnauthorizedContext>().mutation("login", {
	input: z.strictObject({
		email: z.string().email(),
		password,
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
