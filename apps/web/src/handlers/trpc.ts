import { TRPCError, initTRPC } from "@trpc/server";
import { performance } from "node:perf_hooks";

import { AUTH_COOKIE, AUTH_SECURE_COOKIE } from "~app/utils/auth";
import {
	PRETEND_USER_STORE_NAME,
	pretendUserSchema,
} from "~app/utils/store/pretend-user";
import type { UserId } from "~db/ids";
import { transformer } from "~utils/transformer";
import { forwardAuthCookies, getRequestAuth } from "~web/auth/auth";
import type {
	HandlerMeta,
	NetContext,
	UnauthorizedContext,
} from "~web/handlers/context";
import { formatErrorMessage } from "~web/handlers/errors";
import { getCookie } from "~web/utils/cookies";

export const t = initTRPC
	.context<UnauthorizedContext>()
	.meta<HandlerMeta>()
	.create({
		transformer,
		errorFormatter: (opts) => {
			const { shape, error, input } = opts;
			return {
				...shape,
				message: formatErrorMessage(error, shape.message),
				input,
			};
		},
		defaultMeta: {
			title:
				"This is title stub, please add a `.meta()` to a handler emitting this",
			description:
				"This is a description stub, please add a `.meta()` to a handler emitting this",
		},
	});

export const unauthProcedure = t.procedure.use(
	async ({ ctx, type, path, next }) => {
		const start = performance.now();
		const result = await next();
		const duration = performance.now() - start;
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

type AuthSession = {
	session: { token: string };
	user: { id: string; email: string; role: string | null };
};

const getSessionCookie = (ctx: UnauthorizedContext) => {
	const cookieHeader = ctx.reqHeaders.get("cookie");
	return (
		getCookie(cookieHeader, AUTH_COOKIE) ??
		getCookie(cookieHeader, AUTH_SECURE_COOKIE)
	);
};

const getPretendUserEmail = (ctx: NetContext): string | undefined => {
	const pretendUserString = getCookie(
		ctx.reqHeaders.get("cookie"),
		PRETEND_USER_STORE_NAME,
	);
	if (!pretendUserString) {
		return;
	}
	const user = pretendUserSchema.parse(JSON.parse(pretendUserString));
	return user.email;
};

const getPretendUser = async (ctx: UnauthorizedContext, email: string) =>
	ctx.authDatabase
		.selectFrom("auth.user")
		.select(["id", "email"])
		.where("email", "=", email)
		.limit(1)
		.executeTakeFirst();

export const authProcedure = unauthProcedure.use(async ({ ctx, next }) => {
	if (!getSessionCookie(ctx)) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "No token provided",
		});
	}
	// Test error paths can construct a context without backing services.
	// oxlint-disable-next-line typescript/no-unnecessary-condition
	if (!ctx.authDatabase) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Session id mismatch",
		});
	}
	const auth = getRequestAuth(ctx);
	const sessionResponse = await auth.api.getSession({
		headers: ctx.reqHeaders,
		asResponse: true,
	});
	forwardAuthCookies(sessionResponse, ctx.resHeaders);
	if (!sessionResponse.ok) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Session id mismatch",
		});
	}
	const session = (await sessionResponse.json()) as AuthSession | null;
	if (!session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Session id mismatch",
		});
	}
	const realAuth = {
		userId: session.user.id as UserId,
		email: session.user.email,
	};
	const role = session.user.role ?? undefined;
	const pretendUserEmail = getPretendUserEmail(ctx);
	if (
		pretendUserEmail &&
		role === "admin" &&
		!ctx.reqHeaders.get("x-keep-real-auth")
	) {
		const pretendUser = await getPretendUser(ctx, pretendUserEmail);
		if (pretendUser) {
			return next({
				ctx: {
					...ctx,
					logger: ctx.logger.child({ userId: realAuth.userId }),
					realAuth,
					auth: {
						userId: pretendUser.id,
						email: pretendUser.email,
					},
					role,
				},
			});
		}
	}
	return next({
		ctx: {
			...ctx,
			logger: ctx.logger.child({ userId: realAuth.userId }),
			realAuth,
			auth: realAuth,
			role,
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
	return next({ ctx: { ...ctx, auth: ctx.realAuth } });
});
