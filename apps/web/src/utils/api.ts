import { createTRPCClient } from "@trpc/client";
import type { NextApiRequest, NextConfig } from "next";
import getConfig from "next/config";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { AppRouter } from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import { getLinks } from "~app/utils/trpc";
import { getCookies, serializeCookieHeader } from "~web/utils/server-cookies";
import { captureSentryError } from "~web/utils/trpc";

export const getSsrHost = (endpoint: string) => {
	const nextConfig = getConfig() as NextConfig;
	const ssrPort =
		(nextConfig.serverRuntimeConfig?.port as number | undefined) ?? 0;
	const host = process.env.VERCEL_URL || `localhost:${ssrPort}`;
	const secure = Boolean(process.env.VERCEL_URL);
	return `http${secure ? "s" : ""}://${host}${endpoint}`;
};

export const getTrpcClient = (req: NextApiRequest) =>
	createTRPCClient<AppRouter>({
		links: getLinks(req.query, {
			url: getSsrHost(DEFAULT_TRPC_ENDPOINT),
			headers: {
				cookie: serializeCookieHeader(getCookies(req), [AUTH_COOKIE]),
			},
			source: "api-next",
			captureError: captureSentryError,
		}),
	});
