import { createAPIFileRoute } from "@tanstack/react-start/api";

import type { AppRouter } from "~app/trpc";
import { getApiTrpcClient } from "~web/utils/api";

export const APIRoute = createAPIFileRoute("/api/utils/cleanup")({
	POST: async ({ request }) => {
		const client = getApiTrpcClient<AppRouter>(request);
		const [removedSessions, removedResetPasswordIntentions] = await Promise.all(
			[
				client.sessions.cleanup.mutate(),
				client.resetPasswordIntentions.cleanup.mutate(),
			],
		);

		return new Response(
			`Removed ${removedSessions} sessions and ${removedResetPasswordIntentions} reset password intentions`,
		);
	},
});
