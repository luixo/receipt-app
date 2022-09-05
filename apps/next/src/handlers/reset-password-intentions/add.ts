import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import { DAY } from "app/utils/time";
import { emailSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { generateResetPasswordEmail } from "next-app/email/utils";
import { getAccountByEmail } from "next-app/handlers/account/utils";
import { UnauthorizedContext } from "next-app/handlers/context";
import { getEmailClient, isEmailServiceActive } from "next-app/utils/email";

export const router = trpc.router<UnauthorizedContext>().mutation("add", {
	input: z.strictObject({
		email: emailSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const account = await getAccountByEmail(database, input.email, ["id"]);
		if (!account) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Account with email ${input.email} does not exist.`,
			});
		}
		const uuid = v4();
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
				address: input.email,
				subject: "Reset password intention in Receipt App",
				body: generateResetPasswordEmail(uuid),
			});
		} catch (e) {
			throw new trpc.TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: `Something went wrong: ${String(e)}`,
			});
		}
	},
});
