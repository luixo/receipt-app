import * as trpc from "@trpc/server";
import { sql } from "kysely";
import superjson from "superjson";

import {
	shouldUpdateExpirationDate,
	updateAuthorizationSession,
} from "next-app/handlers/auth/utils";
import type { UnauthorizedContext } from "next-app/handlers/context";
import { sessionIdSchema } from "next-app/handlers/validation";
import { AUTH_COOKIE, resetAuthCookie } from "next-app/utils/auth-cookie";
import { getCookie } from "next-app/utils/cookie";

export const t = trpc.initTRPC.context<UnauthorizedContext>().create({
	transformer: superjson,
});

export const unauthProcedure = t.procedure.use(
	t.middleware(async ({ ctx, type, path, next }) => {
		const start = Date.now();
		const result = await next();
		const duration = Date.now() - start;
		const options = {
			path,
			type,
			durationMs: duration,
		};
		if (result.ok) {
			ctx.logger.trace(options, "OK request timing:");
		} else {
			ctx.logger.trace(options, "Non-OK request timing");
		}

		return result;
	}),
);

export const authProcedure = unauthProcedure.use(
	t.middleware(async ({ ctx, next }) => {
		const authToken = getCookie(ctx.req, AUTH_COOKIE);
		if (typeof authToken !== "string" || !authToken) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: "No token provided",
			});
		}
		const uuidVerification = sessionIdSchema.safeParse(authToken);
		if (!uuidVerification.success) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: "Session id mismatch",
			});
		}
		const { database } = ctx;
		const session = await database
			.selectFrom("sessions")
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "sessions.accountId"),
			)
			.select([
				"sessions.accountId",
				"accounts.email",
				"sessions.expirationTimestamp",
			])
			.where("sessions.sessionId", "=", authToken)
			.where("sessions.expirationTimestamp", ">", sql`now()`)
			.executeTakeFirst();
		if (!session) {
			resetAuthCookie(ctx.res);
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: "Session id mismatch",
			});
		}
		if (shouldUpdateExpirationDate(session.expirationTimestamp)) {
			void updateAuthorizationSession(database, authToken);
		}
		return next({
			ctx: {
				...ctx,
				logger: ctx.logger.child({ accountId: session.accountId }),
				auth: {
					sessionId: authToken,
					accountId: session.accountId,
					email: session.email,
				},
			},
		});
	}),
);
