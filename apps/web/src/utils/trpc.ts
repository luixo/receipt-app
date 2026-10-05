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
import { getServerHostUrl } from "~web/utils/url";

const getServerLinksParams = ({
	url,
	source,
	headers,
}: {
	url: string;
	source: GetLinksOptions["source"];
	headers?: Record<string, string>;
}) => {
	const urlObject = new URL(url);
	urlObject.host = new URL(getServerHostUrl(url)).host;
	urlObject.pathname = DEFAULT_TRPC_ENDPOINT;
	return {
		url: urlObject.toString(),
		debug: Boolean(urlObject.searchParams.get("debug")),
		headers,
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
	.server((requestRaw: Request | null): GetLinksOptions => {
		// oxlint-disable-next-line typescript/no-non-null-assertion
		const request = requestRaw!;
		return getServerLinksParams({
			url: request.url,
			source: "ssr-loader",
			headers: fromEntries([...request.headers.entries()]),
		});
	})
	/* c8 ignore start */
	.client((): GetLinksOptions => getClientLinksParams("csr-loader"));
/* c8 ignore stop */

export const getServerTrpcClient = <R extends AnyRouter = AppRouter>(
	opts: Parameters<typeof getServerLinksParams>[0],
) =>
	createTRPCClient<R>({
		links: getLinks(getServerLinksParams(opts)),
	});

export const getLoaderTrpcClient = <R extends AnyRouter = AppRouter>(
	context: Pick<RouterContext, "queryClient" | "request">,
) =>
	createTRPCOptionsProxy<R>({
		client: createTRPCClient<R>({
			links: getLinks(getIsomorphicLinkParams(context.request)),
		}),
		queryClient: context.queryClient,
	});
