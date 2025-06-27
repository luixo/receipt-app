import { serverOnly } from "@tanstack/react-start";
import { createTRPCClient } from "@trpc/client";
import type { AnyRouter } from "@trpc/server/unstable-core-do-not-import";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { AppRouter } from "~app/trpc";
import type { GetLinksOptions } from "~app/utils/trpc";
import { getLinks } from "~app/utils/trpc";
import type { RouterContext } from "~web/pages/__root";
import { getRequest } from "~web/utils/request";
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

const getLinksParamsFromRequest = (
	request: Request,
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

export const getLoaderTrpcClient = <R extends AnyRouter = AppRouter>(
	routerContext: RouterContext,
	debug?: boolean,
) => {
	const linksParams = import.meta.env.SSR
		? getLinksParamsFromRequest(serverOnly(getRequest)(), "ssr")
		: {
				debug,
				headers: {},
				source: "csr" as GetLinksOptions["source"],
				url: DEFAULT_TRPC_ENDPOINT,
				captureError: captureSentryError,
		  };

	return createTRPCOptionsProxy<R>({
		client: createTRPCClient<R>({
			links: getLinks(linksParams),
		}),
		queryClient: routerContext.queryClient,
	});
};

export const getApiTrpcClient = <R extends AnyRouter = AppRouter>(
	req: Request,
) =>
	createTRPCClient<R>({
		links: getLinks(getLinksParamsFromRequest(req, "api")),
	});
