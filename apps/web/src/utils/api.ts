import { createTRPCClient } from "@trpc/client";
import type { NextApiRequest, NextConfig } from "next";
import getConfig from "next/config";

import { DEFAULT_TRPC_ENDPOINT } from "~app/contexts/links-context";
import type { AppRouter } from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import { getLinks } from "~app/utils/trpc";
import { getCookie } from "~web/utils/cookies";
import { captureSentryError } from "~web/utils/trpc";

export const getSsrHost = (endpoint: string) => {
	const nextConfig = getConfig() as NextConfig;
	const ssrPort =
		(nextConfig.serverRuntimeConfig?.port as number | undefined) ?? 0;
	const host = process.env.VERCEL_URL || `localhost:${ssrPort}`;
	const secure = Boolean(process.env.VERCEL_URL);
	return `http${secure ? "s" : ""}://${host}${endpoint}`;
};

const pickAuthCookie = (req: NextApiRequest) => {
	const authCookie = getCookie(req, AUTH_COOKIE);
	if (authCookie) {
		return `${AUTH_COOKIE}=${authCookie}`;
	}
	return "";
};

export const getTrpcClient = (req: NextApiRequest) =>
	createTRPCClient<AppRouter>({
		links: getLinks(req.query, {
			url: getSsrHost(DEFAULT_TRPC_ENDPOINT),
			headers: {
				cookie: pickAuthCookie(req),
			},
			source: "api-next",
			captureError: captureSentryError,
		}),
	});
