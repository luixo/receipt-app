import getConfig from "next/config";
import { createTRPCClient } from "@trpc/client";
import { AppRouter } from "../pages/api/trpc/[trpc]";
import { getSsrHost } from "app/utils/queries";
import superjson from "superjson";

const nextConfig = getConfig();
const client = createTRPCClient<AppRouter>({
	url: getSsrHost(nextConfig.serverRuntimeConfig?.port ?? 0),
	transformer: superjson,
});

export const getTrpcClient = () => client;
