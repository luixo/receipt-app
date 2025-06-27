import { createAPIFileRoute } from "@tanstack/react-start/api";

import { getApiTrpcClient } from "~web/utils/trpc";

export const APIRoute = createAPIFileRoute("/api/utils/ping-cache")({
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
