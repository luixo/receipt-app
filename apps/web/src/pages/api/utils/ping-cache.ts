import { createServerFileRoute } from "@tanstack/react-start/server";

import { getApiTrpcClient } from "~web/utils/trpc";

export const ServerRoute = createServerFileRoute(
	"/api/utils/ping-cache",
).methods({
	POST: async ({ request }) => {
		const client = getApiTrpcClient(request);
		try {
			await Promise.all([client.utils.pingCache.mutate()]);
			return new Response(`Cache ping successful`);
		} catch (e) {
			return new Response(`Error on cache ping: ${String(e)}`, { status: 500 });
		}
	},
});
