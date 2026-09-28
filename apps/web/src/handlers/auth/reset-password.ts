import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	passwordSchema,
	resetPasswordTokenSchema,
} from "~app/utils/validation";
import { generatePasswordData } from "~utils/server/crypto";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Reset password",
		description:
			"Sets a new password for the user matching a valid, unexpired reset password token.",
	})
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
					Temporal.Now.zonedDateTimeISO(),
				),
			)
			.innerJoin("users", (qb) =>
				qb.onRef("users.id", "=", "resetPasswordIntentions.userId"),
			)
			.select(["users.id as userId"])
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
				.updateTable("users")
				.set({
					passwordHash: passwordData.hash,
					passwordSalt: passwordData.salt,
				})
				.where("users.id", "=", resetPasswordIntention.userId)
				.executeTakeFirst();
			await tx
				.deleteFrom("resetPasswordIntentions")
				.where(
					"resetPasswordIntentions.userId",
					"=",
					resetPasswordIntention.userId,
				)
				.execute();
		});
	});
