import { forwardAuthCookies, getRequestAuth } from "~web/auth/auth";
import { authProcedure } from "~web/handlers/trpc";

export const procedure = authProcedure
	.meta({
		title: "Log out",
		description: "Ends the current session and clears the auth cookie.",
	})
	.mutation(async ({ ctx }) => {
		const auth = getRequestAuth(ctx);
		const response = await auth.api.signOut({
			headers: ctx.reqHeaders,
			asResponse: true,
		});
		forwardAuthCookies(response, ctx.resHeaders);
	});
