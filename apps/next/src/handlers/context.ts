import * as trpcNext from "@trpc/server/adapters/next";
import { NextApiRequest, NextApiResponse } from "next";
import { Logger, logger } from "../utils/logger";

export type Context = {
	req: NextApiRequest;
	res: NextApiResponse;
	logger: Logger;
	debug: boolean;
};

export const createContext = (
	opts: trpcNext.CreateNextContextOptions
): Context => ({
	req: opts.req,
	res: opts.res,
	logger,
	debug: Boolean(opts.req.headers.debug),
});
