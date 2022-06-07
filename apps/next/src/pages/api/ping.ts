import type { NextApiRequest, NextApiResponse } from "next";

const handler = async (_req: NextApiRequest, res: NextApiResponse<string>) => {
	res.status(200).send("Pong");
};

export default handler;
