import { TRPCError, initTRPC } from "@trpc/server";

import { transformer } from "~app/utils/trpc";
import {
	SESSION_EXPIRATION_DURATION,
	SESSION_SHOULD_UPDATE_EVERY,
	getExpirationDate,
} from "~web/handlers/auth/utils";
import type { UnauthorizedContext } from "~web/handlers/context";
import { formatErrorMessage } from "~web/handlers/errors";
import { sessionIdSchema } from "~web/handlers/validation";
import {
	AUTH_COOKIE,
	getCookie,
	resetAuthCookie,
	setAuthCookie,
} from "~web/utils/server-cookies";

export const t = initTRPC.context<UnauthorizedContext>().create({
	transformer,
	errorFormatter: (opts) => {
		const { shape, error } = opts;
		return { ...shape, message: formatErrorMessage(error, shape.message) };
	},
});

export const unauthProcedure = t.procedure.use(
	async ({ ctx, type, path, next }) => {
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
	},
);

export const authProcedure = unauthProcedure.use(async ({ ctx, next }) => {
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
				accountId: session.accountId,
				email: session.email,
			},
			authToken,
		},
	});
});
