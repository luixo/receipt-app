import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { add, getNow } from "~utils/date";
import { generateResetPasswordEmail } from "~web/email/utils";
import { unauthProcedure } from "~web/handlers/trpc";
import { MAX_INTENTIONS_AMOUNT, emailSchema } from "~web/handlers/validation";
import { getEmailClient } from "~web/providers/email";

export const procedure = unauthProcedure
	.input(
		z.strictObject({
			email: emailSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("accounts")
			.select("id")
			.where("email", "=", input.email.lowercase)
			.limit(1)
			.executeTakeFirst();
		if (!account) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Account "${input.email.original}" does not exist.`,
			});
		}
		const uuid: string = ctx.getUuid();
		const expirationDate = add.zonedDateTime(getNow.zonedDateTime(), {
			days: 1,
		});
		if (!ctx.emailOptions.active) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Currently password reset is not supported.`,
			});
		}
		const currentIntentions = await database
			.selectFrom("resetPasswordIntentions")
			.where((eb) =>
				eb("resetPasswordIntentions.accountId", "=", account.id).and(
					"expiresTimestamp",
					">",
					getNow.zonedDateTime(),
				),
			)
			.select("expiresTimestamp")
			.execute();
		if (currentIntentions.length >= MAX_INTENTIONS_AMOUNT) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Maximum amount of intentions per day is ${MAX_INTENTIONS_AMOUNT}, please try later.`,
			});
		}
		await database
			.insertInto("resetPasswordIntentions")
			.values({
				accountId: account.id,
				expiresTimestamp: expirationDate,
				token: uuid,
			})
			.executeTakeFirst();
		await getEmailClient(ctx).send({
			address: input.email.lowercase,
			subject: "Reset password intention in Receipt App",
			body: generateResetPasswordEmail(ctx, uuid),
		});
	});
