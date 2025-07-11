import { TRPCError } from "@trpc/server";

import { add, getNow, isFirstEarlier } from "~utils/date";
import { sendVerificationEmail } from "~web/handlers/auth/utils";
import { authProcedure } from "~web/handlers/trpc";

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
			message: `Account "${ctx.auth.email}" is already verified.`,
		});
	}
	const retryTimestamp = add.zonedDateTime(account.confirmationTokenTimestamp, {
		hours: 1,
	});
	if (isFirstEarlier.zonedDateTime(getNow.zonedDateTime(), retryTimestamp)) {
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
			confirmationTokenTimestamp: getNow.zonedDateTime(),
		})
		.where("id", "=", ctx.auth.accountId)
		.execute();
	return {
		email: account.email,
	};
});
