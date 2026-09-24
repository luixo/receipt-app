import { TRPCError } from "@trpc/server";

import { sendVerificationEmail } from "~web/handlers/auth/utils";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Resend verification email",
		description:
			"Resends the  user verification email, rate-limited to once per hour.",
	})
	.mutation(async ({ ctx }) => {
		const { database } = ctx;
		const user = await database
			.selectFrom("users")
			.select(["email", "confirmationTokenTimestamp"])
			.where("id", "=", ctx.auth.userId)
			.executeTakeFirstOrThrow();
		if (!user.confirmationTokenTimestamp) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `User "${ctx.auth.email}" is already verified.`,
			});
		}
		const retryTimestamp = user.confirmationTokenTimestamp.add({
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
		await sendVerificationEmail(ctx, user.email, token);
		await database
			.updateTable("users")
			.set({
				confirmationToken: token,
				confirmationTokenTimestamp: Temporal.Now.zonedDateTimeISO(),
			})
			.where("id", "=", ctx.auth.userId)
			.execute();
		return {
			email: user.email,
		};
	});
