import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { AUTH_COOKIE } from "~app/utils/auth";
import { passwordSchema } from "~app/utils/validation";
import { createAuthorizationSession } from "~web/handlers/auth/utils";
import { unauthProcedure } from "~web/handlers/trpc";
import { emailSchema } from "~web/handlers/validation";
import { setCookie } from "~web/utils/cookies";
import { getHash } from "~web/utils/crypto";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			email: emailSchema,
			password: passwordSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const result = await database
			.selectFrom("accounts")
			.where("email", "=", input.email.lowercase)
			.innerJoin("users", (qb) =>
				qb.onRef("users.connectedAccountId", "=", "accounts.id"),
			)
			.whereRef("users.id", "=", "users.connectedAccountId")
			.select([
				"accounts.id as accountId",
				"accounts.email",
				"accounts.passwordSalt",
				"accounts.passwordHash",
				"accounts.role",
				"users.name",
				"accounts.confirmationToken",
				"accounts.avatarUrl",
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
			result.accountId,
		);
		ctx.logger.debug(
			`Authentication of account "${input.email.original}" succeed.`,
		);
		setCookie(ctx.res, AUTH_COOKIE, authToken, { expires: expirationDate });
		return {
			account: {
				id: result.accountId,
				verified: !result.confirmationToken,
				avatarUrl: result.avatarUrl || undefined,
				role: result.role ?? undefined,
			},
			user: {
				name: result.name,
			},
		};
	});
