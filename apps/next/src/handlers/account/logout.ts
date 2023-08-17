import { removeAuthorizationSession } from "next-app/handlers/auth/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { resetAuthCookie } from "next-app/utils/auth-cookie";

export const procedure = authProcedure.mutation(async ({ ctx }) => {
	const { database } = ctx;
	await removeAuthorizationSession(database, ctx.auth.sessionId);
	resetAuthCookie(ctx.res);
});
