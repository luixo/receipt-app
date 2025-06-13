import * as Sentry from "@sentry/nextjs";
import type { NextApiRequest } from "@trpc/server/adapters/next";
import { createNextApiHandler } from "@trpc/server/adapters/next";
import type { NextApiHandler } from "next";
import httpProxyMiddleware from "next-http-proxy-middleware";
import * as crypto from "node:crypto";
import { v4 } from "uuid";

import type { AppRouter } from "~app/trpc";
import { getDatabase } from "~db/database";
import { router } from "~web/handlers";
import type {
	AuthorizedContext,
	NetContext,
	UnauthorizedContext,
} from "~web/handlers/context";
import { createContext } from "~web/handlers/context";
import { baseLogger } from "~web/providers/logger";
import { getPool } from "~web/providers/pg";
import { getReqHeader } from "~web/utils/headers";

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({ dsn: sentryDsn, tracesSampleRate: 1.0 });
}

const isAuthorizedContext = (
	context: UnauthorizedContext,
): context is AuthorizedContext => "auth" in context;

/* c8 ignore start */
const defaultGetDatabase = (req: NextApiRequest) =>
	getDatabase({
		logger: req.headers["x-debug"]
			? baseLogger.child({ url: req.url || "unknown" })
			: undefined,
		pool: getPool(),
	});
const defaultGetEmailOptions = () => {
	const active = Boolean(process.env.NO_EMAIL_SERVICE);
	if (active && !process.env.BASE_URL) {
		throw new Error(
			`Expected to have env variable BASE_URL while creating context with active email`,
		);
	}
	return {
		active: Boolean(process.env.NO_EMAIL_SERVICE),
		baseUrl: process.env.BASE_URL || "http://example.com/",
	};
};
const createContextRest = (
	req: NextApiRequest,
): Omit<UnauthorizedContext, keyof NetContext> => ({
	logger: baseLogger,
	database: defaultGetDatabase(req),
	emailOptions: defaultGetEmailOptions(),
	cacheDbOptions: {},
	exchangeRateOptions: {},
	s3Options: {},
	getSalt: () => crypto.randomBytes(64).toString("hex"),
	getUuid: () => v4(),
});
/* c8 ignore stop */

const handler = createNextApiHandler<AppRouter>({
	router,
	createContext: (opts) => createContext(opts, createContextRest(opts.req)),
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
			}] [${
				getReqHeader(ctx, "user-agent") ?? "no-user-agent"
			}] ${type} "${path}"${email ? ` (by ${email})` : ""}: ${error.message}`,
		);
	},
	responseMeta: () => ({ status: 200 }),
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
