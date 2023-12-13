import { authProcedure } from "next-app/handlers/trpc";
import { resetAuthCookie } from "next-app/utils/server-cookies";

export const procedure = authProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
	await database
		.deleteFrom("sessions")
		.where("sessionId", "=", ctx.auth.sessionId)
		.executeTakeFirst();
	resetAuthCookie(ctx.res);
});
