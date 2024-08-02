import { createTRPCClient } from "@trpc/client";
import type { NextApiRequest } from "next";
import getConfig from "next/config";

import type { AppRouter } from "~app/trpc";
import { getSsrHost } from "~app/utils/queries";
import { getLinks } from "~app/utils/trpc";
import {
	AUTH_COOKIE,
	getCookies,
	serializeCookieHeader,
} from "~web/utils/server-cookies";
import { captureSentryError } from "~web/utils/trpc";

const nextConfig = getConfig();

export const getTrpcClient = (req: NextApiRequest) =>
	createTRPCClient<AppRouter>({
		links: getLinks(req.query, {
			url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
			headers: {
				cookie: serializeCookieHeader(getCookies(req), [AUTH_COOKIE]),
			},
			source: "api-next",
			captureError: captureSentryError,
		}),
	});
