import { TRPCError } from "@trpc/server";

import { HOUR } from "app/utils/time";
import { sendVerificationEmail } from "next-app/handlers/auth/utils";
import { authProcedure } from "next-app/handlers/trpc";

export const procedure = authProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
	const account = await database
		.selectFrom("accounts")
		.select(["email", "confirmationTokenTimestamp"])
		.where("id", "=", ctx.auth.accountId)
		.executeTakeFirstOrThrow();
	if (!account.confirmationTokenTimestamp) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Account with id ${ctx.auth.accountId} is already verified`,
		});
	}
	const now = Date.now();
	if (now - account.confirmationTokenTimestamp.valueOf() < HOUR) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Verification email to ${ctx.auth.accountId} was sent less than an hour ago. Please try again later.`,
		});
	}
	const token = ctx.getUuid();
	await sendVerificationEmail(ctx.emailOptions, account.email, token);
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
});
