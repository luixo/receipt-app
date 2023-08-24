import * as trpc from "@trpc/server";
import { z } from "zod";

import { passwordSchema } from "app/utils/validation";
import { createAuthorizationSession } from "next-app/handlers/auth/utils";
import { unauthProcedure } from "next-app/handlers/trpc";
import { emailSchema } from "next-app/handlers/validation";
import { setAuthCookie } from "next-app/utils/auth-cookie";
import { getHash } from "next-app/utils/crypto";

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
				"email",
				"passwordSalt",
				"passwordHash",
				"users.name",
				"confirmationToken",
			])
			.executeTakeFirst();

		if (!result) {
			ctx.logger.debug(
				`Authorization of account "${input.email.original}" failed: account not found.`,
			);
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Authorization of account "${input.email.original}" failed: account not found.`,
			});
		} else {
			const isPasswordValid =
				getHash(input.password, result.passwordSalt) === result.passwordHash;
			if (!isPasswordValid) {
				ctx.logger.debug(
					`Authorization of account "${input.email.original}" failed: wrong password.`,
				);
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: `Authentication of account "${input.email.original}" failed.`,
				});
			} else {
				const { authToken, expirationDate } = await createAuthorizationSession(
					database,
					result.accountId,
				);
				ctx.logger.debug(
					`Authorization of account "${input.email.original}" succeed.`,
				);
				setAuthCookie(ctx.res, authToken, expirationDate);
				return {
					account: {
						id: result.accountId,
						verified: !result.confirmationToken,
					},
					user: {
						name: result.name,
					},
				};
			}
		}
	});
