import * as trpc from "@trpc/server";
import { z } from "zod";

import { passwordSchema } from "app/utils/validation";
import { authProcedure } from "next-app/handlers/trpc";
import { generatePasswordData, getHash } from "next-app/utils/crypto";

export const procedure = authProcedure
	.input(
		z.strictObject({
			prevPassword: passwordSchema,
			password: passwordSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("accounts")
			.select(["passwordHash", "passwordSalt"])
			.where("id", "=", ctx.auth.accountId)
			.executeTakeFirstOrThrow();
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
	});
