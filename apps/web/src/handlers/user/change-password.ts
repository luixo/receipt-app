import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { passwordSchema } from "~app/utils/validation";
import { generatePasswordData, getHash } from "~utils/server/crypto";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Change  user password",
		description:
			"Changes the current  user's password after verifying the previous password matches.",
	})
	.input(
		z.strictObject({
			prevPassword: passwordSchema,
			password: passwordSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.select(["passwordHash", "passwordSalt"])
			.where("id", "=", ctx.auth.userId)
			.executeTakeFirstOrThrow();
		const isPrevPasswordValid =
			(await getHash(input.prevPassword, user.passwordSalt)) ===
			user.passwordHash;
		if (!isPrevPasswordValid) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: `Change password of  user "${ctx.auth.email}" failed: password doesn't match.`,
			});
		}
		const passwordData = await generatePasswordData(ctx, input.password);
		await database
			.updateTable("users")
			.set({
				passwordHash: passwordData.hash,
				passwordSalt: passwordData.salt,
			})
			.where("users.id", "=", ctx.auth.userId)
			.executeTakeFirst();
	});
