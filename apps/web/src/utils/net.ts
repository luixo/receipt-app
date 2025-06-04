import type { NextApiRequest, NextApiResponse } from "next";
import type { IncomingMessage } from "node:http";

/* c8 ignore start */
export const createHandler =
	(
		fn: (req: IncomingMessage) => Promise<unknown>,
		options?: {
			allowedMethods: string[];
		},
	) =>
	async (nextReq: NextApiRequest, nextRes: NextApiResponse<string>) => {
		if (
			options?.allowedMethods &&
			!options.allowedMethods.includes(nextReq.method || "GET")
		) {
			nextRes
				.status(405)
				.send(
					`Only method(s) ${options.allowedMethods.join(", ")} are supported`,
				);
			return;
		}
		try {
			const result = await fn(nextReq);
			return typeof result === "string"
				? nextRes.send(result)
				: nextRes.json(JSON.stringify(result));
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error";
			nextRes.status(500).send(message);
		}
	};
/* c8 ignore stop */
