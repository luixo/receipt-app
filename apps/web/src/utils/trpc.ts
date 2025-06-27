import type { QueryClient } from "@tanstack/react-query";
import { serverOnly } from "@tanstack/react-start";
import { createTRPCClient } from "@trpc/client";
import type { AnyRouter } from "@trpc/server/unstable-core-do-not-import";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { fromEntries } from "remeda";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { AppRouter } from "~app/trpc";
import type { GetLinksOptions } from "~app/utils/trpc";
import { getLinks } from "~app/utils/trpc";
import { getRequest } from "~web/utils/request";
import { captureSentryError } from "~web/utils/sentry";

export const getHostUrl = (reqUrl: string, pathname = "") => {
	const url = new URL("", reqUrl);
	url.pathname = pathname;
	/* c8 ignore start */
	if (process.env.VERCEL_URL) {
		url.host = process.env.VERCEL_URL;
	}
	/* c8 ignore stop */
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
		headers: fromEntries([...request.headers.entries()]),
		source,
		keepError: Boolean(import.meta.env.VITEST),
		captureError: captureSentryError,
	};
};

export const getLoaderTrpcClient = <R extends AnyRouter = AppRouter>(
	queryClient: QueryClient,
	debug?: boolean,
) => {
	/* c8 ignore start */
	const linksParams =
		import.meta.env.SSR && !import.meta.env.VITEST
			? getLinksParamsFromRequest(serverOnly(getRequest)(), "ssr")
			: {
					debug,
					headers: {},
					source: "csr" as GetLinksOptions["source"],
					url: (import.meta.env.BASE_URL || "") + DEFAULT_TRPC_ENDPOINT,
					captureError: captureSentryError,
			  };
	/* c8 ignore stop */

	return createTRPCOptionsProxy<R>({
		client: createTRPCClient<R>({
			links: getLinks(linksParams),
		}),
		queryClient,
	});
};

export const getApiTrpcClient = <R extends AnyRouter = AppRouter>(
	req: Request,
) =>
	createTRPCClient<R>({
		links: getLinks(getLinksParamsFromRequest(req, "api")),
	});
