import * as trpc from "@trpc/server";
import { z } from "zod";

import { passwordSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { unauthProcedure } from "next-app/handlers/trpc";
import { resetPasswordTokenSchema } from "next-app/handlers/validation";
import { generatePasswordData } from "next-app/utils/crypto";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			token: resetPasswordTokenSchema,
			password: passwordSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const resetPasswordIntention = await database
			.selectFrom("resetPasswordIntentions")
			.where("token", "=", input.token)
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "resetPasswordIntentions.accountId"),
			)
			.select(["email", "token", "accounts.id as accountId"])
			.executeTakeFirst();
		if (!resetPasswordIntention) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Reset password intention ${input.token} does not exist.`,
			});
		}
		const passwordData = generatePasswordData(input.password);
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("accounts")
				.set({
					passwordHash: passwordData.hash,
					passwordSalt: passwordData.salt,
				})
				.where("accounts.id", "=", resetPasswordIntention.accountId)
				.executeTakeFirst();
			await tx
				.deleteFrom("resetPasswordIntentions")
				.where("token", "=", input.token)
				.execute();
		});
	});
