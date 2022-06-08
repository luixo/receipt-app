import * as trpcNext from "@trpc/server/adapters/next";
import { NextApiRequest, NextApiResponse } from "next";

export type Context = {
	req: NextApiRequest;
	res: NextApiResponse;
};

export const createContext = (
	opts: trpcNext.CreateNextContextOptions
): Context => ({
	req: opts.req,
	res: opts.res,
});
