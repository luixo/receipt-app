import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { passwordSchema } from "~app/utils/validation";
import { unauthProcedure } from "~web/handlers/trpc";
import { resetPasswordTokenSchema } from "~web/handlers/validation";
import { generatePasswordData } from "~web/utils/crypto";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			token: resetPasswordTokenSchema,
			password: passwordSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const resetPasswordIntention = await database
			.selectFrom("resetPasswordIntentions")
			.where((eb) =>
				eb("token", "=", input.token).and(
					"resetPasswordIntentions.expiresTimestamp",
					">",
					new Date(),
				),
			)
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "resetPasswordIntentions.accountId"),
			)
			.select(["accounts.id as accountId"])
			.limit(1)
			.executeTakeFirst();
		if (!resetPasswordIntention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Reset password intention "${input.token}" does not exist or expired.`,
			});
		}
		const passwordData = await generatePasswordData(ctx, input.password);
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
				.where(
					"resetPasswordIntentions.accountId",
					"=",
					resetPasswordIntention.accountId,
				)
				.execute();
		});
	});
