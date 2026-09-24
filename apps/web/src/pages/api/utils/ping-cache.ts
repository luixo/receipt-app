import { createFileRoute } from "@tanstack/react-router";

import { router } from "~web/handlers/index";
import { getServerTrpcClient } from "~web/utils/server/trpc";

export const Route = createFileRoute("/api/utils/ping-cache")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const client = getServerTrpcClient(router, request);
					await client.utils.pingCache.mutate();
					return new Response(`Cache ping successful`);
				} catch (error) {
					return new Response(`Error on cache ping: ${String(error)}`, {
						status: 500,
					});
				}
			},
		},
	},
});
