import { createFileRoute } from "@tanstack/react-router";

import { getApiTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/api/utils/cleanup")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const client = getApiTrpcClient(request);
				try {
					const [removedSessions, removedResetPasswordIntentions] =
						await Promise.all([
							client.sessions.cleanup.mutate(),
							client.resetPasswordIntentions.cleanup.mutate(),
						]);

					return new Response(
						`Removed ${removedSessions} sessions and ${removedResetPasswordIntentions} reset password intentions`,
					);
				} catch (e) {
					return new Response(`Error on cleanup: ${String(e)}`, {
						status: 500,
					});
				}
			},
		},
	},
});
