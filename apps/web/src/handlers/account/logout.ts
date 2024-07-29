import { authProcedure } from "~web/handlers/trpc";
import { resetAuthCookie } from "~web/utils/server-cookies";

export const procedure = authProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
	await database
		.deleteFrom("sessions")
		.where("sessionId", "=", ctx.authToken)
		.executeTakeFirst();
	resetAuthCookie(ctx.res);
});
