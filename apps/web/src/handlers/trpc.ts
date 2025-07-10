import { TRPCError, initTRPC } from "@trpc/server";
import { isNonNullish, unique } from "remeda";

import { AUTH_COOKIE } from "~app/utils/auth";
import {
	PRETEND_USER_STORE_NAME,
	pretendUserSchema,
} from "~app/utils/store/pretend-user";
import type { AccountsId } from "~db/models";
import { transformer } from "~utils/transformer";
import {
	SESSION_EXPIRATION_DURATION,
	SESSION_SHOULD_UPDATE_EVERY,
	getExpirationDate,
} from "~web/handlers/auth/utils";
import { queueCallFactory } from "~web/handlers/batch";
import type { NetContext, UnauthorizedContext } from "~web/handlers/context";
import { formatErrorMessage } from "~web/handlers/errors";
import { sessionIdSchema } from "~web/handlers/validation";
import { getCookie, setCookie } from "~web/utils/cookies";
import { getReqHeader } from "~web/utils/headers";

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

const getAuthToken = (ctx: UnauthorizedContext) =>
	getCookie(getReqHeader(ctx, "cookie"), AUTH_COOKIE);

const getPretendAccountEmail = (ctx: NetContext): string | undefined => {
	const pretendUserString = getCookie(
		getReqHeader(ctx, "cookie"),
		PRETEND_USER_STORE_NAME,
	);
	if (!pretendUserString) {
		return;
	}
	const user = pretendUserSchema.parse(JSON.parse(pretendUserString));
	return user.email;
};

const queueSession = queueCallFactory<
	UnauthorizedContext,
	{ authToken: string },
	{
		realAuth: {
			accountId: AccountsId;
			email: string;
		};
		auth: {
			accountId: AccountsId;
			email: string;
		};
		role: string | undefined;
	}
>(
	(ctx) => async (inputs) => {
		const authTokens = unique(inputs.map(({ authToken }) => authToken));
		const pretendAccountEmail = getPretendAccountEmail(ctx);
		const [sessions, pretendAccount] = await Promise.all([
			ctx.database
				.selectFrom("sessions")
				.innerJoin("accounts", (qb) =>
					qb.onRef("accounts.id", "=", "sessions.accountId"),
				)
				.select([
					"sessions.accountId",
					"accounts.email",
					"accounts.role",
					"sessions.expirationTimestamp",
					"sessions.sessionId",
				])
				.where((eb) =>
					eb("sessions.sessionId", "in", authTokens).and(
						"sessions.expirationTimestamp",
						">",
						new Date(),
					),
				)
				.execute(),
			pretendAccountEmail
				? ctx.database
						.selectFrom("accounts")
						.where("accounts.email", "=", pretendAccountEmail)
						.select(["accounts.id", "accounts.email"])
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
				accountId: matchedSession.accountId,
				email: matchedSession.email,
			};
			if (
				pretendAccount &&
				matchedSession.role === "admin" &&
				!getReqHeader(ctx, "x-keep-real-auth")
			) {
				return {
					realAuth: auth,
					auth: {
						accountId: pretendAccount.id,
						email: pretendAccount.email,
					},
					role: matchedSession.role as "admin",
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
				if (
					!matchedSession ||
					matchedSession.expirationTimestamp.valueOf() - Date.now() >=
						SESSION_EXPIRATION_DURATION - SESSION_SHOULD_UPDATE_EVERY
				) {
					return;
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
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				getAuthToken(ctx)!,
				getReqHeader(ctx, "x-keep-real-auth") ?? "",
			]
				.filter(Boolean)
				.join("/"),
	},
);

export const authProcedure = unauthProcedure.use(async ({ ctx, next }) => {
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
		ctx,
		input: { authToken },
		signal: new AbortController().signal,
	});
	return next({
		ctx: {
			...ctx,
			logger: ctx.logger.child({ accountId: auth.accountId }),
			realAuth,
			auth,
			authToken,
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
