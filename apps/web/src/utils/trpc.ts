import { createTRPCClient } from "@trpc/client";
import type { AnyRouter } from "@trpc/server/unstable-core-do-not-import";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { fromEntries } from "remeda";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { AppRouter } from "~app/trpc";
import type { GetLinksOptions } from "~app/utils/trpc";
import { getLinks } from "~app/utils/trpc";
import type { RouterContext } from "~web/pages/__root";
import { captureSentryError } from "~web/utils/sentry";

const getLinksParamsFromRequest = (
	request: Request,
	source: GetLinksOptions["source"],
) => {
	const urlObject = new URL(request.url);
	urlObject.pathname = DEFAULT_TRPC_ENDPOINT;
	return {
		debug: Boolean(urlObject.searchParams.get("debug")),
		url: urlObject.toString(),
		headers: fromEntries([...request.headers.entries()]),
		source,
		keepError: Boolean(import.meta.env.VITEST),
		captureError: captureSentryError,
	};
};

export const getLoaderTrpcClient = <R extends AnyRouter = AppRouter>(
	context: Pick<RouterContext, "queryClient" | "request">,
	debug?: boolean,
) => {
	const linksParams = context.request
		? /* c8 ignore start */
			getLinksParamsFromRequest(context.request, "ssr")
		: {
				debug,
				headers: {},
				source: "csr" as GetLinksOptions["source"],
				url: DEFAULT_TRPC_ENDPOINT,
				captureError: captureSentryError,
			};
	/* c8 ignore stop */

	return createTRPCOptionsProxy<R>({
		client: createTRPCClient<R>({
			links: getLinks(linksParams),
		}),
		queryClient: context.queryClient,
	});
};

export const getApiTrpcClient = <R extends AnyRouter = AppRouter>(
	req: Request,
) =>
	createTRPCClient<R>({
		links: getLinks(getLinksParamsFromRequest(req, "api")),
	});
