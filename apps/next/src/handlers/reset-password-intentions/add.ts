import * as trpc from "@trpc/server";
import { z } from "zod";

import { DAY } from "app/utils/time";
import { generateResetPasswordEmail } from "next-app/email/utils";
import { unauthProcedure } from "next-app/handlers/trpc";
import { emailSchema } from "next-app/handlers/validation";
import { getUuid } from "next-app/utils/crypto";
import { getEmailClient, isEmailServiceActive } from "next-app/utils/email";

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
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Account with email ${input.email.original} does not exist.`,
			});
		}
		const uuid = getUuid();
		const expirationDate = new Date(Date.now() + DAY);
		if (!isEmailServiceActive()) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Currently password reset is not supported`,
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
		try {
			await getEmailClient().send({
				address: input.email.lowercase,
				subject: "Reset password intention in Receipt App",
				body: generateResetPasswordEmail(uuid),
			});
		} catch (e) {
			throw new trpc.TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Something went wrong: ${String(e)}`,
			});
		}
	});
