import { TRPCError } from "@trpc/server";

import { sendVerificationEmail } from "~web/handlers/auth/utils";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Resend verification email",
		description:
			"Resends the account verification email, rate-limited to once per hour.",
	})
	.mutation(async ({ ctx }) => {
		const { database } = ctx;
		const account = await database
			.selectFrom("accounts")
			.select(["email", "confirmationTokenTimestamp"])
			.where("id", "=", ctx.auth.accountId)
			.executeTakeFirstOrThrow();
		if (!account.confirmationTokenTimestamp) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Account "${ctx.auth.email}" is already verified.`,
			});
		}
		const retryTimestamp = account.confirmationTokenTimestamp.add({
			hours: 1,
		});
		if (
			Temporal.ZonedDateTime.compare(
				Temporal.Now.zonedDateTimeISO(),
				retryTimestamp,
			) < 0
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Verification email to "${ctx.auth.email}" was sent less than an hour ago. Please try again later.`,
			});
		}
		const token = ctx.getUuid();
		await sendVerificationEmail(ctx, account.email, token);
		await database
			.updateTable("accounts")
			.set({
				confirmationToken: token,
				confirmationTokenTimestamp: Temporal.Now.zonedDateTimeISO(),
			})
			.where("id", "=", ctx.auth.accountId)
			.execute();
		return {
			email: account.email,
		};
	});
