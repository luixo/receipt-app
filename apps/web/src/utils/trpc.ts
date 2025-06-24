import { createTRPCClient } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { AppRouter } from "~app/trpc";
import type { GetLinksOptions } from "~app/utils/trpc";
import { getLinks } from "~app/utils/trpc";
import type { RouterContext } from "~web/pages/__root";
import { captureSentryError } from "~web/utils/sentry";

export const getHostUrl = (reqUrl?: string, pathname = "") => {
	if (!reqUrl) {
		return "";
	}
	const url = new URL("", reqUrl);
	url.pathname = pathname;
	if (process.env.VERCEL_URL) {
		url.host = process.env.VERCEL_URL;
	}
	return url.toString();
};

export const getLinksParamsFromRequest = (
	{ request }: Extract<RouterContext["environment"], { type: "server" }>,
	source: GetLinksOptions["source"],
) => {
	const url = new URL(request.url);
	return {
		debug: Boolean(url.searchParams.get("debug")),
		url: getHostUrl(request.url, DEFAULT_TRPC_ENDPOINT),
		headers: {
			cookie: request.headers.get("cookie") || undefined,
		},
		source,
		captureError: captureSentryError,
	};
};

export const getLoaderTrpcClient = (
	routerContext: RouterContext,
	debug?: boolean,
) => {
	const linksParams =
		routerContext.environment.type === "server"
			? getLinksParamsFromRequest(routerContext.environment, "ssr")
			: {
					debug,
					headers: {},
					source: "csr" as GetLinksOptions["source"],
					url: DEFAULT_TRPC_ENDPOINT,
					captureError: captureSentryError,
			  };

	return createTRPCOptionsProxy<AppRouter>({
		client: createTRPCClient<AppRouter>({
			links: getLinks(linksParams),
		}),
		queryClient: routerContext.queryClient,
	});
};
