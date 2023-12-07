import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";

import {
	SESSION_EXPIRATION_DURATION,
	SESSION_SHOULD_UPDATE_EVERY,
	getExpirationDate,
} from "next-app/handlers/auth/utils";
import type { UnauthorizedContext } from "next-app/handlers/context";
import { formatErrorMessage } from "next-app/handlers/errors";
import { sessionIdSchema } from "next-app/handlers/validation";
import {
	AUTH_COOKIE,
	resetAuthCookie,
	setAuthCookie,
} from "next-app/utils/auth-cookie";
import { getCookie } from "next-app/utils/cookie";

export const t = initTRPC.context<UnauthorizedContext>().create({
	transformer: superjson,
	errorFormatter: (opts) => {
		const { shape, error } = opts;
		return { ...shape, message: formatErrorMessage(error, shape.message) };
	},
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
			ctx.logger.trace(options, "Non-OK request timing:");
		}

		return result;
	}),
);

export const authProcedure = unauthProcedure.use(
	t.middleware(async ({ ctx, next }) => {
		const authToken = getCookie(ctx.req, AUTH_COOKIE);
		if (typeof authToken !== "string" || !authToken) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "No token provided",
			});
		}
		const uuidVerification = sessionIdSchema.safeParse(authToken);
		if (!uuidVerification.success) {
			throw new TRPCError({
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
			.where((eb) =>
				eb("sessions.sessionId", "=", authToken).and(
					"sessions.expirationTimestamp",
					">",
					new Date(),
				),
			)
			.executeTakeFirst();
		if (!session) {
			resetAuthCookie(ctx.res);
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Session id mismatch",
			});
		}
		if (
			session.expirationTimestamp.valueOf() - Date.now() <
			SESSION_EXPIRATION_DURATION - SESSION_SHOULD_UPDATE_EVERY
		) {
			const nextExpirationTimestamp = getExpirationDate();
			void database
				.updateTable("sessions")
				.set({ expirationTimestamp: nextExpirationTimestamp })
				.where("sessionId", "=", authToken)
				.executeTakeFirst();
			setAuthCookie(ctx.res, authToken, nextExpirationTimestamp);
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
