import { createTRPCClient } from "@trpc/client";
import getConfig from "next/config";
import superjson from "superjson";

import { getSsrHost } from "app/utils/queries";
import { AppRouter } from "next-app/pages/api/trpc/[trpc]";

const nextConfig = getConfig();
const client = createTRPCClient<AppRouter>({
	url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
	transformer: superjson,
});

export const getTrpcClient = () => client;
