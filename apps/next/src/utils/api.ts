import { createTRPCClient, httpLink } from "@trpc/client";
import type { NextApiRequest } from "next";
import getConfig from "next/config";
import superjson from "superjson";

import { getSsrHost } from "app/utils/queries";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";

const nextConfig = getConfig();

export const getTrpcClient = (req: NextApiRequest) =>
	createTRPCClient<AppRouter>({
		links: [
			httpLink({
				url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
				headers: {
					debug: req.query.debug ? "true" : undefined,
					cookie: req.headers.cookie,
				},
			}),
		],
		transformer: superjson,
	});
