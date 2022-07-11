import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { resetAuthCookie } from "../../utils/auth-cookie";
import { removeAuthorizationSession } from "../auth/utils";
import { AuthorizedContext } from "../context";

export const router = trpc.router<AuthorizedContext>().mutation("logout", {
	input: z.undefined(),
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		await removeAuthorizationSession(database, ctx.auth.sessionId);
		resetAuthCookie(ctx.res);
	},
});
