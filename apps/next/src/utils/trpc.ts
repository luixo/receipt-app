import { setupTRPC } from "@trpc/next";
import { NextConfig } from "next";
import getConfig from "next/config";
import superjson from "superjson";

import {
	getQueryClientConfig,
	getSsrHost,
	TRPC_ENDPOINT,
} from "app/utils/queries";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import { AUTH_COOKIE } from "next-app/utils/auth-cookie";
import { getCookie, serialize } from "next-app/utils/cookie";

export const trpcNext = setupTRPC<AppRouter>({
	config: ({ ctx }) => {
		const queryClientConfig = getQueryClientConfig();
		const debugHeader = ctx?.query.debug ? "true" : undefined;
		if (typeof window !== "undefined") {
			return {
				url: TRPC_ENDPOINT,
				queryClientConfig,
				headers: {
					debug: debugHeader,
				},
				transformer: superjson,
			};
		}
		const nextConfig: NextConfig = getConfig();
		const authToken = ctx?.req ? getCookie(ctx.req, AUTH_COOKIE) : undefined;
		return {
			url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
			queryClientConfig,
			headers: {
				debug: debugHeader,
				cookie: authToken ? serialize(AUTH_COOKIE, authToken) : undefined,
			},
			transformer: superjson,
		};
	},
	ssr: true,
});
