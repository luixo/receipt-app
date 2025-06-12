import { getApiTrpcClient } from "~web/utils/api";
import { createHandler } from "~web/utils/net";

const handler = createHandler(
	async (req) => {
		const client = getApiTrpcClient(req);
		const [removedSessions, removedResetPasswordIntentions] = await Promise.all(
			[
				client.sessions.cleanup.mutate(),
				client.resetPasswordIntentions.cleanup.mutate(),
			],
		);
		return `Removed ${removedSessions} sessions and ${removedResetPasswordIntentions} reset password intentions`;
	},
	{
		allowedMethods: ["POST"],
	},
);

export default handler;
