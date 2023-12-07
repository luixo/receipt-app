import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DAY } from "app/utils/time";
import { generateResetPasswordEmail } from "next-app/email/utils";
import { unauthProcedure } from "next-app/handlers/trpc";
import {
	MAX_INTENTIONS_AMOUNT,
	emailSchema,
} from "next-app/handlers/validation";
import { getEmailClient } from "next-app/providers/email";

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
			.executeTakeFirst();
		if (!account) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Account "${input.email.original}" does not exist.`,
			});
		}
		const uuid: string = ctx.getUuid();
		const expirationDate = new Date(Date.now() + DAY);
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
					new Date(),
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
		await getEmailClient(ctx.emailOptions).send({
			address: input.email.lowercase,
			subject: "Reset password intention in Receipt App",
			body: generateResetPasswordEmail(ctx.emailOptions, uuid),
		});
	});
