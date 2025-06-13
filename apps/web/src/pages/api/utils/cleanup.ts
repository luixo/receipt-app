import { createAPIFileRoute } from "@tanstack/react-start/api";

import { getApiTrpcClient } from "~web/utils/api";

export const APIRoute = createAPIFileRoute("/api/utils/cleanup")({
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
