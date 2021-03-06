import * as trpc from "@trpc/server";
import { MiddlewareFunction } from "@trpc/server/dist/declarations/src/internals/middlewares";
import { sql } from "kysely";

import { DAY } from "app/utils/time";
import { getDatabase } from "next-app/db";
import {
	UnauthorizedContext,
	AuthorizedContext,
} from "next-app/handlers/context";
import { sessionIdSchema } from "next-app/handlers/validation";
import { AUTH_COOKIE, resetAuthCookie } from "next-app/utils/auth-cookie";
import { getCookie } from "next-app/utils/cookie";

export const middleware: MiddlewareFunction<
	UnauthorizedContext,
	AuthorizedContext,
	unknown
> = async ({ ctx, next }) => {
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
	const database = getDatabase(ctx);
	const session = await database
		.selectFrom("sessions")
		.select(["accountId"])
		.where("sessionId", "=", authToken)
		.where("expirationTimestamp", ">", sql`now()`)
		.executeTakeFirst();
	if (!session) {
		resetAuthCookie(ctx.res);
		throw new trpc.TRPCError({
			code: "UNAUTHORIZED",
			message: "Session id mismatch",
		});
	}
	const expirationDate = new Date(Date.now() + 7 * DAY);
	await database
		.updateTable("sessions")
		.set({ expirationTimestamp: expirationDate })
		.where("sessionId", "=", authToken)
		.executeTakeFirst();
	return next({
		ctx: {
			...ctx,
			logger: ctx.logger.child({ accountId: session.accountId }),
			auth: {
				sessionId: authToken,
				accountId: session.accountId,
			},
		},
	});
};
