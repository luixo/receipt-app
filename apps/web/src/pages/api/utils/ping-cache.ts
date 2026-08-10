import { createFileRoute } from "@tanstack/react-router";

import { getApiTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/api/utils/ping-cache")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const client = getApiTrpcClient(request);
				try {
					await client.utils.pingCache.mutate();
					return new Response(`Cache ping successful`);
				} catch (e) {
					return new Response(`Error on cache ping: ${String(e)}`, {
						status: 500,
					});
				}
			},
		},
	},
});
