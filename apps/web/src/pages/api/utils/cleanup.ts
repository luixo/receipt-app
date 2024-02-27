import type { NextApiRequest, NextApiResponse } from "next";

import { getTrpcClient } from "~web/utils/api";

const handler = async (req: NextApiRequest, res: NextApiResponse<string>) => {
	if (req.method !== "POST") {
		res.status(405).send("Only POST is supported");
		return;
	}
	const client = getTrpcClient(req);
	const [removedSessions, removedResetPasswordIntentions] = await Promise.all([
		client.sessions.cleanup.mutate(),
		client.resetPasswordIntentions.cleanup.mutate(),
	]);
	res.send(
		`Removed ${removedSessions} sessions and ${removedResetPasswordIntentions} reset password intentions`,
	);
};

export default handler;
