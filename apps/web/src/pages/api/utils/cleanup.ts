import { createServerFileRoute } from "@tanstack/react-start/server";

import { getApiTrpcClient } from "~web/utils/api";

export const ServerRoute = createServerFileRoute("/api/utils/cleanup").methods({
	POST: async ({ request }) => {
		const client = getApiTrpcClient(request);
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
