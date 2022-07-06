import type { NextApiRequest, NextApiResponse } from "next";
import { getTrpcClient } from "../../../utils/api";

const handler = async (req: NextApiRequest, res: NextApiResponse<string>) => {
	if (req.method !== "POST") {
		res.status(405).send("Only POST is supported");
		return;
	}
	const client = getTrpcClient();
	const removedAmount = await client.mutation("sessions.cleanup");
	res.send(`Removed ${removedAmount} sessions`);
};

export default handler;
