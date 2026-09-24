import { createFileRoute } from "@tanstack/react-router";

import type { router } from "~web/handlers/index";
import { getApiTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/api/utils/ping-cache")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const client = getApiTrpcClient<typeof router>(request);
				try {
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
