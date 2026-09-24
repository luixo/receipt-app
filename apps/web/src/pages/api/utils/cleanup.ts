import { createFileRoute } from "@tanstack/react-router";

import { router } from "~web/handlers/index";
import { getServerTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/api/utils/cleanup")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const client = getServerTrpcClient(router, request);
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
