import type { AnyRoute } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import type { Register, RouteMethodHandlerFn } from "@tanstack/react-start";
import { proxyRequest } from "@tanstack/react-start/server";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import { apiCookieNames } from "~utils/mocks";
import { transformer } from "~utils/transformer";
import { router } from "~web/handlers";
import { getCookie } from "~web/utils/cookies";
import { env } from "~web/utils/env";
import { createServerContext } from "~web/utils/server/trpc";

type Callback = RouteMethodHandlerFn<
	Register,
	AnyRoute,
	"/api/trpc/$",
	unknown,
	unknown,
	unknown,
	unknown
>;

const getTestRequestHandlerProps = ({
	// @ts-expect-error This is a hack for tests
	router: overrideRouter,
}: Omit<Parameters<Callback>[0], "request">): object => {
	/* c8 ignore start */
	if (!import.meta.env.VITEST) {
		return {};
	}
	/* c8 ignore stop */
	return { endpoint: "", router: overrideRouter as unknown };
};

const redirectTestHandler = async (
	request: Request,
	cookieHeader: string,
	proxyPort: string,
) => {
	if (import.meta.env.MODE !== "test") {
		// oxlint-disable-next-line no-console
		console.warn(
			"You are trying to use proxying without activating --mode=test",
		);
		return new Response("Proxying is only allowed in test mode", {
			status: 403,
		});
	}
	const proxyUrl = new URL(request.url);
	proxyUrl.port = proxyPort;
	request.headers.set(
		"cookie",
		cookieHeader
			.replace(
				new RegExp(
					String.raw`(?:^|;\s*)(${apiCookieNames.proxyPort}=[^;]+)(?=;|$)`,
				),
				"",
			)
			.replace(/^;/, "") || "",
	);
	const { body, status, statusText, headers } = await proxyRequest(
		proxyUrl.toString(),
		{ headers: request.headers, fetchOptions: { signal: request.signal } },
	);
	return new Response(body, { status, statusText, headers });
};

const callback = async (
	request: Request,
	rest: Omit<Parameters<Callback>[0], "request">,
) => {
	const cookieHeader = request.headers.get("cookie") ?? "";
	const proxyPort = getCookie(cookieHeader, apiCookieNames.proxyPort);
	if (proxyPort) {
		return redirectTestHandler(request, cookieHeader, proxyPort);
	}
	if (import.meta.env.MODE === "test" && env.PLAYWRIGHT) {
		return Response.json({
			error: transformer.serialize({
				code: 400,
				message: [
					"Unexpected test mode tRPC fetch for url",
					decodeURIComponent(request.url),
				].join("\n"),
			}),
		});
	}
	return fetchRequestHandler({
		endpoint: DEFAULT_TRPC_ENDPOINT,
		req: request,
		router,
		createContext: (opts) => createServerContext(opts.req),
		onError: ({ error, type, path, ctx }) => {
			/* c8 ignore start */
			if (!ctx) {
				return;
			}
			/* c8 ignore stop */
			if (error instanceof TRPCError && !error.message) {
				const errors =
					error.cause instanceof AggregateError ? error.cause.errors : [error];
				const internalConnectionError = errors.find(
					(
						subError: Record<string, unknown>,
					): subError is {
						syscall: "connect";
						code: "ECONNREFUSED";
						address: string;
						port: number;
					} =>
						subError.syscall === "connect" && subError.code === "ECONNREFUSED",
				);
				if (internalConnectionError) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Can't connect to the ${internalConnectionError.address}:${internalConnectionError.port}`,
					});
				}
			}
			if (error.code === "UNAUTHORIZED" && path === "account.get") {
				// Do not log an attempt to fetch the account without a cookie
				return;
			}
			ctx.logger.error(
				`[${error.code}] [${
					ctx.reqHeaders.get("user-agent") ?? "no-user-agent"
				}] ${type} "${path}": ${error.message}`,
			);
		},
		responseMeta: ({ ctx }) => ({
			status: 200,
			headers: ctx ? ctx.resHeaders : {},
		}),
		...getTestRequestHandlerProps(rest),
	});
};

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			GET: ({ request, ...rest }) => callback(request, rest),
			POST: ({ request, ...rest }) => callback(request, rest),
		},
	},
});
