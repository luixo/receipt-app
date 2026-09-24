import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AUTH_COOKIE } from "~app/utils/auth";
import { passwordSchema } from "~app/utils/validation";
import { getHash } from "~utils/server/crypto";
import { createAuthorizationSession } from "~web/handlers/auth/utils";
import { unauthProcedure } from "~web/handlers/trpc";
import { emailSchema } from "~web/handlers/validation";
import { setCookie } from "~web/utils/cookies";

export const procedure = unauthProcedure
	.meta({
		title: "Log in",
		description:
			"Authenticates an account by email and password and starts a new session.",
	})
	.input(
		z.strictObject({
			email: emailSchema,
			password: passwordSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const result = await database
			.selectFrom("users")
			.where("email", "=", input.email.lowercase)
			.innerJoin("peers", (qb) =>
				qb.onRef("peers.connectedUserId", "=", "users.id"),
			)
			.whereRef("peers.id", "=", "peers.connectedUserId")
			.select([
				"users.id as userId",
				"users.email",
				"users.passwordSalt",
				"users.passwordHash",
				"users.role",
				"peers.name",
				"users.confirmationToken",
				"users.avatarUrl",
			])
			.limit(1)
			.executeTakeFirst();

		if (!result) {
			const errorMessage = `Authentication of account "${input.email.original}" failed: account not found.`;
			ctx.logger.debug(errorMessage);
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: errorMessage,
			});
		}
		const isPasswordValid =
			(await getHash(input.password, result.passwordSalt)) ===
			result.passwordHash;
		if (!isPasswordValid) {
			const errorMessage = `Authentication of account "${input.email.original}" failed: password is wrong.`;
			ctx.logger.debug(errorMessage);
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: errorMessage,
			});
		}
		const { authToken, expirationDate } = await createAuthorizationSession(
			ctx,
			result.userId,
		);
		ctx.logger.debug(
			`Authentication of account "${input.email.original}" succeed.`,
		);
		setCookie(ctx, AUTH_COOKIE, authToken, { expires: expirationDate });
		return {
			user: {
				id: result.userId,
				verified: !result.confirmationToken,
				avatarUrl: result.avatarUrl || undefined,
				role: result.role ?? undefined,
			},
			peer: {
				name: result.name,
			},
		};
	});
