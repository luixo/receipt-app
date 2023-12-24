import { createTRPCClient } from "@trpc/client";
import type { NextApiRequest } from "next";
import getConfig from "next/config";

import { getSsrHost } from "app/utils/queries";
import { getLinks, transformer } from "app/utils/trpc";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import { getCookies } from "next-app/utils/server-cookies";

const nextConfig = getConfig();

export const getTrpcClient = (req: NextApiRequest) =>
	createTRPCClient<AppRouter>({
		links: getLinks(getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0), {
			searchParams: req.query,
			cookies: getCookies(req),
			source: "api-next",
		}),
		transformer,
	});
