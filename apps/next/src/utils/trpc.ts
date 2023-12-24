import { createTRPCNext } from "@trpc/next";
import type { NextConfig, NextPageContext } from "next";
import getConfig from "next/config";

import { TRPC_ENDPOINT, getSsrHost } from "app/utils/queries";
import {
	awaitPrepassRender,
	getLinks,
	getQueryClientConfig,
	transformer,
} from "app/utils/trpc";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import { getCookies } from "next-app/utils/server-cookies";

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
						cookies: getCookies(ctx.req),
						source: "ssr-next",
					},
			  )
			: getLinks(TRPC_ENDPOINT, {
					useBatch: true,
					searchParams,
					cookies: undefined,
					source: "csr-next",
			  }),
		queryClientConfig: getQueryClientConfig(),
		transformer,
	}),
	serverSideContext: (ctx) => ({ searchParams: ctx.query }),
	ssr: true,
	awaitPrepassRender,
});
