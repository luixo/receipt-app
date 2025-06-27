import { createAPIFileRoute } from "@tanstack/react-start/api";

import type { AppRouter } from "~app/trpc";
import { getApiTrpcClient } from "~web/utils/api";

export const APIRoute = createAPIFileRoute("/api/utils/ping-cache")({
	POST: async ({ request }) => {
		const client = getApiTrpcClient<AppRouter>(request);
		try {
			await Promise.all([client.utils.pingCache.mutate()]);
			return new Response(`Cache ping successful`);
		} catch (e) {
			return new Response(`Error on cache ping: ${String(e)}`, { status: 500 });
		}
	},
});
