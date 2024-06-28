import type { NextApiRequest, NextApiResponse } from "next";

import { getTrpcClient } from "~web/utils/api";

const handler = async (req: NextApiRequest, res: NextApiResponse<string>) => {
	if (req.method !== "POST") {
		res.status(405).send("Only POST is supported");
		return;
	}
	const client = getTrpcClient(req);
	try {
		await Promise.all([client.utils.pingCache.mutate()]);
		res.send(`Cache ping successful`);
	} catch (e) {
		res.status(500).send(`Error on cache ping: ${String(e)}`);
	}
};

export default handler;
