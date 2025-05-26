import type { NodeHTTPCreateContextFnOptions } from "@trpc/server/dist/adapters/node-http";
import type { NextApiRequest, NextApiResponse } from "next";

import type { NetContext } from "~web/handlers/context";
import {
	createRequestHeaders,
	createResponseHeaders,
} from "~web/utils/headers";

const convertRequest = (req: NextApiRequest): NetContext["req"] => ({
	url: req.url || "",
	headers: createRequestHeaders(req.headers),
	query: req.query,
	socketId: `${req.socket.remoteAddress}:${req.socket.localPort}`,
});

export const createHandler =
	(
		fn: (req: NetContext["req"]) => Promise<unknown>,
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
			const result = await fn(convertRequest(nextReq));
			return typeof result === "string"
				? nextRes.send(result)
				: nextRes.json(JSON.stringify(result));
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error";
			nextRes.status(500).send(message);
		}
	};

export const createNetContext = ({
	req,
	res,
	info,
}: NodeHTTPCreateContextFnOptions<
	NextApiRequest,
	NextApiResponse
>): NetContext => ({
	req: convertRequest(req),
	res: {
		headers: createResponseHeaders(res),
	},
	info,
});
