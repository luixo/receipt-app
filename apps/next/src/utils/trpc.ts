import { httpLink, httpBatchLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import { NextConfig } from "next";
import getConfig from "next/config";
import superjson from "superjson";

import {
	getQueryClientConfig,
	getSsrHost,
	TRPC_ENDPOINT,
} from "app/utils/queries";
import { SECOND } from "app/utils/time";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import { AUTH_COOKIE } from "next-app/utils/auth-cookie";
import { getCookie, serialize } from "next-app/utils/cookie";

export const trpcNext = createTRPCNext<
	AppRouter,
	{ authToken?: string; hasDebug: boolean }
>({
	config: ({ meta }) => {
		const isBrowser = typeof window !== "undefined";
		return {
			links: [
				(isBrowser ? httpBatchLink : httpLink)({
					url: isBrowser
						? TRPC_ENDPOINT
						: getSsrHost(
								(getConfig() as NextConfig).serverRuntimeConfig?.port ?? 0
						  ),
					headers: {
						debug: meta.hasDebug ? "true" : undefined,
						cookie: meta.authToken
							? serialize(AUTH_COOKIE, meta.authToken)
							: undefined,
					},
				}),
			],
			queryClientConfig: getQueryClientConfig(),
			transformer: superjson,
			ssrTimeout: 3 * SECOND,
		};
	},
	meta: (ctx) => ({
		authToken: ctx.req ? getCookie(ctx.req, AUTH_COOKIE) : undefined,
		hasDebug: Boolean(ctx.query.debug),
	}),
	ssr: true,
});
