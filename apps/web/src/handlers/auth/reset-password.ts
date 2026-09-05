import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	passwordSchema,
	resetPasswordTokenSchema,
} from "~app/utils/validation";
import { getNow } from "~utils/date";
import { generatePasswordData } from "~utils/server/crypto";
import { unauthProcedure } from "~web/handlers/trpc";

export const procedure = unauthProcedure
	.meta({
		title: "Reset password",
		description:
			"Sets a new password for the account matching a valid, unexpired reset password token.",
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
					getNow.zonedDateTime(),
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
