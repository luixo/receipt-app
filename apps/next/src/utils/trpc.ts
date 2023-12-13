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
import { omitUndefined } from "app/utils/utils";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import {
	AUTH_COOKIE,
	getCookie,
	serialize,
} from "next-app/utils/server-cookies";

export const trpcNext = createTRPCNext<
	AppRouter,
	{
		hasDebug: boolean;
		// Required to define Playwright test worker for a mock response
		proxyPort?: number;
		// Required to define Playwright test id for a mock response
		controllerId?: string;
	},
	NextPageContext & { timeoutPromise: Promise<true> }
>({
	config: ({
		serverSideContext: { hasDebug, proxyPort, controllerId },
		ctx,
	}) => {
		const isBrowser = typeof window !== "undefined";
		const authToken = ctx?.req ? getCookie(ctx.req, AUTH_COOKIE) : undefined;
		const linkUrl = isBrowser
			? TRPC_ENDPOINT
			: getSsrHost((getConfig() as NextConfig).serverRuntimeConfig?.port ?? 0);
		// we omit to  not let stringified "undefined" get passed to the server
		const headers = omitUndefined({
			debug: hasDebug ? "true" : undefined,
			cookie: authToken ? serialize(AUTH_COOKIE, authToken) : undefined,
			"x-proxy-port": proxyPort ? String(proxyPort) : undefined,
			"x-controller-id": controllerId,
		});
		return {
			links: getLinks(linkUrl, { useBatch: isBrowser, headers }),
			queryClientConfig: getQueryClientConfig(),
			transformer,
		};
	},
	serverSideContext: (ctx) => ({
		hasDebug: Boolean(ctx.query.debug),
		proxyPort: Number.isNaN(Number(ctx.query.proxyPort))
			? undefined
			: Number(ctx.query.proxyPort),
		controllerId:
			typeof ctx.query.controllerId === "string"
				? ctx.query.controllerId
				: undefined,
	}),
	ssr: true,
	awaitPrepassRender,
});
