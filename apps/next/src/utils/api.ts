import { createTRPCClient } from "@trpc/client";
import { getSsrHost } from "app/utils/queries";
import getConfig from "next/config";
import superjson from "superjson";

import { AppRouter } from "../pages/api/trpc/[trpc]";

const nextConfig = getConfig();
const client = createTRPCClient<AppRouter>({
	url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
	transformer: superjson,
});

export const getTrpcClient = () => client;
