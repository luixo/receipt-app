import { createIsomorphicFn } from "@tanstack/react-start";
import { createTRPCClient } from "@trpc/client";
import type { AnyRouter } from "@trpc/server/unstable-core-do-not-import";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { fromEntries } from "remeda";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { AppRouter } from "~app/trpc";
import { getLinks } from "~app/utils/trpc";
import type { GetLinksOptions } from "~app/utils/trpc";
import type { RouterContext } from "~web/pages/__root";
import { captureSentryError } from "~web/utils/sentry";

const getServerLinksParams = (
	request: Request,
	source: GetLinksOptions["source"],
) => {
	const url = new URL(request.url);
	url.pathname = DEFAULT_TRPC_ENDPOINT;
	return {
		url: url.toString(),
		debug: Boolean(url.searchParams.get("debug")),
		headers: fromEntries([...request.headers.entries()]),
		source,
		captureError: captureSentryError,
	};
};

/* c8 ignore start */
const getClientLinksParams = (
	source: GetLinksOptions["source"],
): GetLinksOptions => {
	const url = new URL(window.location.href);
	return {
		url: DEFAULT_TRPC_ENDPOINT,
		debug: Boolean(url.searchParams.get("debug")),
		headers: {},
		source,
		keepError: Boolean(import.meta.env.VITEST),
		captureError: captureSentryError,
	};
};
/* c8 ignore stop */

const getIsomorphicLinkParams = createIsomorphicFn()
	.server((request: Request | null): GetLinksOptions =>
		// oxlint-disable-next-line typescript/no-non-null-assertion
		getServerLinksParams(request!, "ssr-loader"),
	)
	/* c8 ignore start */
	.client((): GetLinksOptions => getClientLinksParams("csr-loader"));
/* c8 ignore stop */

export const getLoaderTrpcClient = <R extends AnyRouter = AppRouter>(
	context: Pick<RouterContext, "queryClient" | "request">,
) =>
	createTRPCOptionsProxy<R>({
		client: createTRPCClient<R>({
			links: getLinks(getIsomorphicLinkParams(context.request)),
		}),
		queryClient: context.queryClient,
	});
