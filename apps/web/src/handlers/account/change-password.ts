import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { passwordSchema } from "~app/utils/validation";
import { authProcedure } from "~web/handlers/trpc";
import { generatePasswordData, getHash } from "~web/utils/crypto";

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
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: `Change password of account "${ctx.auth.email}" failed: password doesn't match.`,
			});
		}
		const passwordData = generatePasswordData(ctx, input.password);
		await database
			.updateTable("accounts")
			.set({
				passwordHash: passwordData.hash,
				passwordSalt: passwordData.salt,
			})
			.where("accounts.id", "=", ctx.auth.accountId)
			.executeTakeFirst();
	});
