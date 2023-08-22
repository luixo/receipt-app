import * as Sentry from "@sentry/nextjs";
import * as trpcNext from "@trpc/server/adapters/next";

import { router } from "next-app/handlers";
import type {
	AuthorizedContext,
	UnauthorizedContext,
} from "next-app/handlers/context";
import { createContext } from "next-app/handlers/context";

export type AppRouter = typeof router;

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 1.0 });

const isAuthorizedContext = (
	context: UnauthorizedContext,
): context is AuthorizedContext => "auth" in context;

export default Sentry.withSentry(
	trpcNext.createNextApiHandler<AppRouter>({
		router,
		createContext,
		onError: ({ error, type, path, ctx }) => {
			if (!ctx) {
				return;
			}
			const email = isAuthorizedContext(ctx) ? ctx.auth.email : undefined;
			if (error.code === "UNAUTHORIZED" && path === "account.get") {
				// Do not log an attempt to fetch the account without a cookie
				return;
			}
			ctx.logger.error(
				`[${error.code}] [${ctx.req.socket.remoteAddress}:${
					ctx.req.socket.localPort
				}] [${ctx.req.headers["user-agent"]}] ${type} "${path}"${
					email ? ` (by ${email})` : ""
				}: ${error.message}`,
			);
		},
		responseMeta: () => ({ status: 200 }),
	}),
);

export const config = {
	api: {
		externalResolver: true,
	},
};
