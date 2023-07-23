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

const SSR_TIMEOUT = 3 * SECOND;

export const trpcNext = createTRPCNext<
	AppRouter,
	{ authToken?: string; hasDebug: boolean }
>({
	config: ({ meta: { authToken, hasDebug } }) => {
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
						debug: hasDebug ? "true" : undefined,
						cookie: authToken ? serialize(AUTH_COOKIE, authToken) : undefined,
					},
				}),
			],
			queryClientConfig: getQueryClientConfig(),
			transformer: superjson,
		};
	},
	meta: (ctx) => ({
		authToken: ctx.req ? getCookie(ctx.req, AUTH_COOKIE) : undefined,
		hasDebug: Boolean(ctx.query.debug),
	}),
	ssr: true,
	awaitPrespassRender: async (queryClient) => {
		if (!queryClient.isFetching()) {
			return true;
		}

		const prefetchPromise = new Promise<void>((resolve) => {
			const unsub = queryClient.getQueryCache().subscribe((event) => {
				if (event?.query.getObserversCount() === 0) {
					resolve();
					unsub();
				}
			});
		});
		await Promise.race([
			prefetchPromise,
			new Promise((resolve) => {
				setTimeout(() => {
					void queryClient.cancelQueries();
					resolve(undefined);
				}, SSR_TIMEOUT);
			}),
		]);
		return true;
	},
});
