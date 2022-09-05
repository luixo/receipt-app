import * as trpc from "@trpc/server";
import { v4 } from "uuid";

import { HOUR } from "app/utils/time";
import { getDatabase } from "next-app/db";
import { sendVerificationEmail } from "next-app/handlers/auth/utils";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<AuthorizedContext>().mutation("resendEmail", {
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		const account = await database
			.selectFrom("accounts")
			.select(["email", "confirmationTokenTimestamp"])
			.where("id", "=", ctx.auth.accountId)
			.executeTakeFirst();
		if (!account) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `There is no account with id ${ctx.auth.accountId}`,
			});
		}
		if (!account.confirmationTokenTimestamp) {
			throw new trpc.TRPCError({
				code: "BAD_REQUEST",
				message: `Account with id ${ctx.auth.accountId} is already verified`,
			});
		}
		const now = Date.now();
		if (now - account.confirmationTokenTimestamp.valueOf() < HOUR) {
			throw new trpc.TRPCError({
				code: "BAD_REQUEST",
				message: `Verification email to ${ctx.auth.accountId} was sent less than an hour ago. Please try again later.`,
			});
		}
		const token = v4();
		await sendVerificationEmail(account.email, token);
		await database
			.updateTable("accounts")
			.set({
				confirmationToken: token,
				confirmationTokenTimestamp: new Date(),
			})
			.where("id", "=", ctx.auth.accountId)
			.execute();
		return {
			email: account.email,
		};
	},
});
