import { TRPCError, initTRPC } from "@trpc/server";
import type { IncomingMessage } from "node:http";

import { AUTH_COOKIE } from "~app/utils/auth";
import {
	PRETEND_USER_COOKIE_NAME,
	pretendUserSchema,
} from "~app/utils/cookie/pretend-user";
import { transformer } from "~app/utils/trpc";
import {
	SESSION_EXPIRATION_DURATION,
	SESSION_SHOULD_UPDATE_EVERY,
	getExpirationDate,
} from "~web/handlers/auth/utils";
import type { UnauthorizedContext } from "~web/handlers/context";
import { formatErrorMessage } from "~web/handlers/errors";
import { sessionIdSchema } from "~web/handlers/validation";
import { getCookie, setCookie } from "~web/utils/cookies";

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

const getPretendAccountEmail = (req: IncomingMessage): string | undefined => {
	if (req.headers["x-keep-real-auth"]) {
		return;
	}
	const pretendUserString = getCookie(req, PRETEND_USER_COOKIE_NAME);
	if (!pretendUserString) {
		return;
	}
	const user = pretendUserSchema.parse(JSON.parse(pretendUserString));
	return user.email;
};

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
			"accounts.role",
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
		setCookie(ctx.res, AUTH_COOKIE, authToken, {
			expires: nextExpirationTimestamp,
		});
	}
	let auth = {
		accountId: session.accountId,
		email: session.email,
	};
	const pretendAccountEmail = getPretendAccountEmail(ctx.req);
	if (pretendAccountEmail && session.role === "admin") {
		const pretendAccount = await database
			.selectFrom("accounts")
			.where("accounts.email", "=", pretendAccountEmail)
			.select(["accounts.id", "accounts.email"])
			.executeTakeFirst();
		if (pretendAccount) {
			auth = {
				accountId: pretendAccount.id,
				email: pretendAccount.email,
			};
		}
	}
	return next({
		ctx: {
			...ctx,
			logger: ctx.logger.child({ accountId: session.accountId }),
			auth,
			authToken,
			role: session.role ?? undefined,
		},
	});
});

export const adminProcedure = authProcedure.use(async ({ ctx, next }) => {
	if (ctx.role !== "admin") {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Admin procedure is available only if you're an admin",
		});
	}
	return next();
});
