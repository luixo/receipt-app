import { TRPCError, initTRPC } from "@trpc/server";
import { performance } from "node:perf_hooks";
import { isNonNullish, unique } from "remeda";

import { AUTH_COOKIE } from "~app/utils/auth";
import {
	PRETEND_USER_STORE_NAME,
	pretendUserSchema,
} from "~app/utils/store/pretend-user";
import type { UserId } from "~db/ids";
import { transformer } from "~utils/transformer";
import {
	SESSION_REFRESH_DURATION,
	getExpirationDate,
} from "~web/handlers/auth/utils";
import { queueCallFactory } from "~web/handlers/batch";
import type {
	HandlerMeta,
	NetContext,
	UnauthorizedContext,
} from "~web/handlers/context";
import { formatErrorMessage } from "~web/handlers/errors";
import { sessionIdSchema } from "~web/handlers/validation";
import { getCookie, setCookie } from "~web/utils/cookies";

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

const getAuthToken = (ctx: UnauthorizedContext) =>
	getCookie(ctx.reqHeaders.get("cookie"), AUTH_COOKIE);

const getPretendUserEmail = (ctx: NetContext): string | undefined => {
	const pretendUserString = getCookie(
		ctx.reqHeaders.get("cookie"),
		PRETEND_USER_STORE_NAME,
	);
	if (!pretendUserString) {
		return;
	}
	const peer = pretendUserSchema.parse(JSON.parse(pretendUserString));
	return peer.email;
};

const queueSession = queueCallFactory<
	UnauthorizedContext,
	{ authToken: string },
	{
		realAuth: {
			userId: UserId;
			email: string;
		};
		auth: {
			userId: UserId;
			email: string;
		};
		role: string | undefined;
	}
>(
	(ctx) => async (inputs) => {
		const authTokens = unique(inputs.map(({ authToken }) => authToken));
		const pretendUserEmail = getPretendUserEmail(ctx);
		const [sessions, pretendUser] = await Promise.all([
			ctx.database
				.selectFrom("sessions")
				.innerJoin("users", (qb) =>
					qb.onRef("users.id", "=", "sessions.userId"),
				)
				.select([
					"sessions.userId",
					"users.email",
					"users.role",
					"sessions.expirationTimestamp",
					"sessions.sessionId",
				])
				.where((eb) =>
					eb("sessions.sessionId", "in", authTokens).and(
						"sessions.expirationTimestamp",
						">",
						Temporal.Now.zonedDateTimeISO(),
					),
				)
				.execute(),
			pretendUserEmail
				? ctx.database
						.selectFrom("users")
						.where("users.email", "=", pretendUserEmail)
						.select(["users.id", "users.email"])
						.limit(1)
						.executeTakeFirst()
				: undefined,
		]);
		const sessionsOrErrors = inputs.map((input) => {
			const matchedSession = sessions.find(
				(session) => session.sessionId === input.authToken,
			);
			if (!matchedSession) {
				return new TRPCError({
					code: "UNAUTHORIZED",
					message: "Session id mismatch",
				});
			}
			const auth = {
				userId: matchedSession.userId,
				email: matchedSession.email,
			};
			if (
				pretendUser &&
				matchedSession.role === "admin" &&
				!ctx.reqHeaders.get("x-keep-real-auth")
			) {
				return {
					realAuth: auth,
					auth: {
						userId: pretendUser.id,
						email: pretendUser.email,
					},
					role: matchedSession.role,
				};
			}
			return {
				realAuth: auth,
				auth,
				role: matchedSession.role ?? undefined,
			};
		});
		const updateableSessions = authTokens
			.map((authToken) => {
				const matchedSession = sessions.find(
					(session) => session.sessionId === authToken,
				);
				if (!matchedSession) {
					return undefined;
				}
				const refreshSessionTimestamp =
					matchedSession.expirationTimestamp.subtract(SESSION_REFRESH_DURATION);
				if (
					Temporal.ZonedDateTime.compare(
						Temporal.Now.zonedDateTimeISO(),
						refreshSessionTimestamp,
					) < 0
				) {
					return undefined;
				}
				return {
					authToken,
					nextExpirationTimestamp: getExpirationDate(),
				};
			})
			.filter(isNonNullish);
		void ctx.database.transaction().execute(async (tx) => {
			await Promise.all(
				updateableSessions.map(
					async ({ authToken, nextExpirationTimestamp }) => {
						await tx
							.updateTable("sessions")
							.set({ expirationTimestamp: nextExpirationTimestamp })
							.where("sessionId", "=", authToken)
							.executeTakeFirst();
						setCookie(ctx, AUTH_COOKIE, authToken, {
							expires: nextExpirationTimestamp,
						});
					},
				),
			);
		});
		return sessionsOrErrors;
	},
	{
		getKey: (ctx) =>
			[
				// If we've got here, auth token surely exists
				// oxlint-disable-next-line typescript/no-non-null-assertion
				getAuthToken(ctx)!,
				ctx.reqHeaders.get("x-keep-real-auth") ?? "",
			]
				.filter(Boolean)
				.join("/"),
	},
);

export const authProcedure = unauthProcedure.use(
	async ({ ctx, next, path }) => {
		const authToken = getAuthToken(ctx);
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
		const { realAuth, auth, role } = await queueSession({
			path,
			ctx,
			input: { authToken },
			signal: new AbortController().signal,
		});
		return next({
			ctx: {
				...ctx,
				logger: ctx.logger.child({ userId: auth.userId }),
				realAuth,
				auth,
				authToken,
				role,
			},
		});
	},
);

export const adminProcedure = authProcedure.use(async ({ ctx, next }) => {
	if (ctx.role !== "admin") {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Admin procedure is available only if you're an admin",
		});
	}
	return next({ ctx: { ...ctx, auth: ctx.realAuth } });
});
