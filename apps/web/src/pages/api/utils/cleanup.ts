import { createFileRoute } from "@tanstack/react-router";

import type { router } from "~web/handlers/index";
import { getApiTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/api/utils/cleanup")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const client = getApiTrpcClient<typeof router>(request);
				try {
					const [
						{ count: removedSessions },
						{ count: removedResetPasswordIntentions },
					] = await Promise.all([
						client.sessions.cleanup.mutate(),
						client.resetPasswordIntentions.cleanup.mutate(),
					]);

					return new Response(
						`Removed ${removedSessions} sessions and ${removedResetPasswordIntentions} reset password intentions`,
					);
				} catch (error) {
					return new Response(`Error on cleanup: ${String(error)}`, {
						status: 500,
					});
				}
			},
		},
	},
});
