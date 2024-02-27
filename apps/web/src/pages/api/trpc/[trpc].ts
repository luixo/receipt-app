import * as Sentry from "@sentry/nextjs";
import * as trpcNext from "@trpc/server/adapters/next";
import { nodeHTTPFormDataContentTypeHandler } from "@trpc/server/adapters/node-http/content-type/form-data";
import { nodeHTTPJSONContentTypeHandler } from "@trpc/server/adapters/node-http/content-type/json";
import type { NextApiHandler } from "next";
import httpProxyMiddleware from "next-http-proxy-middleware";

import { router } from "~web/handlers";
import type {
	AuthorizedContext,
	UnauthorizedContext,
} from "~web/handlers/context";
import { createContext } from "~web/handlers/context";

export type AppRouter = typeof router;

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({ dsn: sentryDsn, tracesSampleRate: 1.0 });
}

const isAuthorizedContext = (
	context: UnauthorizedContext,
): context is AuthorizedContext => "auth" in context;

const handler = trpcNext.createNextApiHandler<AppRouter>({
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
	experimental_contentTypeHandlers: [
		nodeHTTPFormDataContentTypeHandler(),
		nodeHTTPJSONContentTypeHandler(),
	],
});

export default Sentry.wrapApiHandlerWithSentry<NextApiHandler>(
	async (req, res) => {
		const proxyPort = req.headers["x-proxy-port"];
		if (proxyPort && typeof proxyPort === "string") {
			if (process.env.NEXT_PUBLIC_ENV !== "test") {
				// eslint-disable-next-line no-console
				console.warn(
					"You are trying to use proxying without activating NEXT_PUBLIC_ENV=test",
				);
				res.status(403).end("Proxying is only allowed in test mode");
				return;
			}
			void httpProxyMiddleware(req, res, {
				target: `http://localhost:${proxyPort}`,
			});
			return;
		}
		return handler(req, res);
	},
	"/trpc/[trpc]",
);

export const config = {
	api: {
		externalResolver: true,
		bodyParser: false,
		responseLimit: "10mb",
	},
};
