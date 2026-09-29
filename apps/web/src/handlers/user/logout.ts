import { AUTH_COOKIE } from "#app/utils/auth.ts";
import { authProcedure } from "#web/handlers/trpc.ts";
import { setCookie } from "#web/utils/cookies.ts";

export const procedure = authProcedure
	.meta({
		title: "Log out",
		description: "Ends the current session and clears the auth cookie.",
	})
	.mutation(async ({ ctx }) => {
		const { database } = ctx;
		await database
			.deleteFrom("sessions")
			.where("sessionId", "=", ctx.authToken)
			.executeTakeFirst();
		setCookie(ctx, AUTH_COOKIE, "", {
			expires: Temporal.Now.zonedDateTimeISO(),
		});
	});
