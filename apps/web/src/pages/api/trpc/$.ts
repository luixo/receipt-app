import type { StartAPIMethodCallback } from "@tanstack/react-start/api";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { proxyRequest } from "@tanstack/react-start/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { toReqRes } from "fetch-to-node";
import * as crypto from "node:crypto";
import { entries, fromEntries } from "remeda";
import { v4 } from "uuid";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import { getDatabase } from "~db/database";
import { router } from "~web/handlers";
import type { NetContext, UnauthorizedContext } from "~web/handlers/context";
import { createContext } from "~web/handlers/context";
import { baseLogger } from "~web/providers/logger";
import { getPool } from "~web/providers/pg";
import { getReqHeader } from "~web/utils/headers";

/* c8 ignore start */
const defaultGetDatabase = (req: Request) =>
	getDatabase({
		logger: req.headers.get("x-debug")
			? baseLogger.child({ url: req.url || "unknown" })
			: undefined,
		pool: getPool(),
	});
const defaultGetEmailOptions = () => {
	const active = Boolean(process.env.EMAIL_SERVICE_ACTIVE);
	if (active && !process.env.BASE_URL) {
		throw new Error(
			`Expected to have env variable BASE_URL while creating context with active email`,
		);
	}
	return {
		active: Boolean(process.env.EMAIL_SERVICE_ACTIVE),
		baseUrl: process.env.BASE_URL || "http://example.com/",
	};
};
const createContextRest = (
	req: Request,
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

const getTestRequestHandlerProps = ({
	// @ts-expect-error This is a hack for tests
	router: overrideRouter,
}: Omit<
	Parameters<StartAPIMethodCallback<"/api/trpc/$">>[0],
	"request" | "params"
>): object => {
	/* c8 ignore start */
	if (!import.meta.env.VITEST) {
		return {};
	}
	/* c8 ignore stop */
	return { endpoint: "", router: overrideRouter };
};

const callback: StartAPIMethodCallback<"/api/trpc/$"> = async ({
	request,
	...rest
}) => {
	const proxyUrl = new URL(request.url);
	const proxyPort = proxyUrl.searchParams.get("proxyPort");
	if (proxyPort && typeof proxyPort === "string") {
		if (import.meta.env.MODE !== "test") {
			// eslint-disable-next-line no-console
			console.warn(
				"You are trying to use proxying without activating --mode=test",
			);
			return new Response("Proxying is only allowed in test mode", {
				status: 403,
			});
		}
		proxyUrl.port = proxyPort;
		proxyUrl.searchParams.delete("proxyPort");
		await proxyRequest(proxyUrl.toString());
		return new Response();
	}
	return fetchRequestHandler({
		endpoint: DEFAULT_TRPC_ENDPOINT,
		req: request,
		router,
		createContext: (opts) => {
			const { req, res } = toReqRes(opts.req);
			return createContext(
				{ req, res, info: opts.info },
				createContextRest(opts.req),
			);
		},
		onError: ({ error, type, path, ctx }) => {
			/* c8 ignore start */
			if (!ctx) {
				return;
			}
			/* c8 ignore stop */
			if (error.code === "UNAUTHORIZED" && path === "account.get") {
				// Do not log an attempt to fetch the account without a cookie
				return;
			}
			ctx.logger.error(
				`[${error.code}] [${
					getReqHeader(ctx, "user-agent") ?? "no-user-agent"
				}] ${type} "${path}": ${error.message}`,
			);
		},
		responseMeta: ({ ctx }) => ({
			status: 200,
			headers: fromEntries(
				// We expect to always have context
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				entries(ctx!.event.node.res.getHeaders()).map(([key, value]) => [
					key,
					typeof value === "number" ? value.toString() : value,
				]),
			),
		}),
		...getTestRequestHandlerProps(rest),
	});
};

export const APIRoute = createAPIFileRoute("/api/trpc/$")({
	GET: callback,
	POST: callback,
});
