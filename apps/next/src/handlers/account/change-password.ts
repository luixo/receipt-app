import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { generatePasswordData, getHash } from "../../utils/crypto";
import { getAccountById } from "./utils";
import { AuthorizedContext } from "../context";
import { password } from "../zod";

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
