import * as trpc from "@trpc/server";

import { getDatabase } from "next-app/db";
import { removeAuthorizationSession } from "next-app/handlers/auth/utils";
import { AuthorizedContext } from "next-app/handlers/context";
import { resetAuthCookie } from "next-app/utils/auth-cookie";

export const router = trpc.router<AuthorizedContext>().mutation("logout", {
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		await removeAuthorizationSession(database, ctx.auth.sessionId);
		resetAuthCookie(ctx.res);
	},
});
