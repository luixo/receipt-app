import type { NextApiRequest, NextApiResponse } from "next";

import { getTrpcClient } from "next-app/utils/api";

const handler = async (req: NextApiRequest, res: NextApiResponse<string>) => {
	if (req.method !== "POST") {
		res.status(405).send("Only POST is supported");
		return;
	}
	const client = getTrpcClient();
	const [removedSessions, removedResetPasswordIntentions] = await Promise.all([
		client.mutation("sessions.cleanup"),
		client.mutation("reset-password-intentions.cleanup"),
	]);
	res.send(
		`Removed ${removedSessions} sessions and ${removedResetPasswordIntentions} reset password intentions`
	);
};

export default handler;
