import * as trpc from "@trpc/server";
import { z } from "zod";

import { AuthorizedContext } from "../context";
import { resetAuthCookie } from "../../utils/auth-cookie";
import { getDatabase } from "../../db";
import { removeAuthorizationSession } from "../auth/utils";

export const router = trpc.router<AuthorizedContext>().mutation("logout", {
	input: z.undefined(),
	resolve: async ({ ctx }) => {
		const database = getDatabase(ctx);
		await removeAuthorizationSession(database, ctx.auth.sessionId);
		resetAuthCookie(ctx.res);
	},
});
