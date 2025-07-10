import { AUTH_COOKIE } from "~app/utils/auth";
import { getNow } from "~utils/date";
import { authProcedure } from "~web/handlers/trpc";
import { setCookie } from "~web/utils/cookies";

export const procedure = authProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
	await database
		.deleteFrom("sessions")
		.where("sessionId", "=", ctx.authToken)
		.executeTakeFirst();
	setCookie(ctx, AUTH_COOKIE, "", { expires: getNow() });
});
