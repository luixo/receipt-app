import * as Sentry from "@sentry/nextjs";
import { createTRPCNext } from "@trpc/next";
import type { NextConfig, NextPageContext } from "next";
import getConfig from "next/config";

import type { AppRouter } from "~app/trpc";
import { TRPC_ENDPOINT, getSsrHost } from "~app/utils/queries";
import type { GetLinksOptions } from "~app/utils/trpc";
import {
	awaitPrepassRender,
	getLinks,
	getQueryClientConfig,
	transformer,
} from "~app/utils/trpc";
import {
	AUTH_COOKIE,
	getCookies,
	serializeCookieHeader,
} from "~web/utils/server-cookies";

export const captureSentryError: GetLinksOptions["captureError"] = (error) => {
	const transactionId = Math.random().toString(36).slice(2, 9);
	Sentry.captureException(error, {
		tags: { transaction_id: transactionId },
	});
	return transactionId;
};

export const trpcNext = createTRPCNext<
	AppRouter,
	{ searchParams: Record<string, string[] | string | undefined> },
	NextPageContext & { timeoutPromise: Promise<true> }
>({
	config: ({ serverSideContext: { searchParams }, ctx }) => ({
		links: ctx?.req
			? getLinks(
					getSsrHost(
						(getConfig() as NextConfig).serverRuntimeConfig?.port ?? 0,
					),
					{
						useBatch: false,
						searchParams,
						headers: {
							cookie: serializeCookieHeader(getCookies(ctx.req), [AUTH_COOKIE]),
						},
						source: "ssr-next",
						captureError: captureSentryError,
					},
			  )
			: getLinks(TRPC_ENDPOINT, {
					// Don't batch requests when in tests - to evaluate pending / error states separately
					useBatch: !searchParams.proxyPort,
					searchParams,
					source: "csr-next",
					captureError: captureSentryError,
			  }),
		queryClientConfig: getQueryClientConfig(),
		transformer,
	}),
	serverSideContext: (ctx) => ({ searchParams: ctx.query }),
	ssr: true,
	awaitPrepassRender,
});
