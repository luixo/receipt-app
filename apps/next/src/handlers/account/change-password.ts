import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getAccountById } from "next-app/handlers/account/utils";
import { AuthorizedContext } from "next-app/handlers/context";
import { password } from "next-app/handlers/zod";
import { generatePasswordData, getHash } from "next-app/utils/crypto";

export const router = trpc
	.router<AuthorizedContext>()
	.mutation("change-password", {
		input: z.strictObject({
			prevPassword: password,
			password,
		}),
		resolve: async ({ input, ctx }) => {
			const database = getDatabase(ctx);
			const account = await getAccountById(database, ctx.auth.accountId, [
				"passwordHash",
				"passwordSalt",
			]);
			if (!account) {
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: `Change password of account "${ctx.auth.accountId}" failed: user doesn't exist.`,
				});
			}
			const isPrevPasswordValid =
				getHash(input.prevPassword, account.passwordSalt) ===
				account.passwordHash;
			if (!isPrevPasswordValid) {
				throw new trpc.TRPCError({
					code: "UNAUTHORIZED",
					message: `Change password of account "${ctx.auth.accountId}" failed: password doesn't match.`,
				});
			}
			const passwordData = generatePasswordData(input.password);
			await database
				.updateTable("accounts")
				.set({
					passwordHash: passwordData.hash,
					passwordSalt: passwordData.salt,
				})
				.where("accounts.id", "=", ctx.auth.accountId)
				.executeTakeFirst();
		},
	});
