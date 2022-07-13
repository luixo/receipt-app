import * as trpcNext from "@trpc/server/adapters/next";
import { NextApiRequest, NextApiResponse } from "next";

import { AccountsId } from "next-app/db/models";
import { Logger, logger } from "next-app/utils/logger";

export type UnauthorizedContext = {
	req: NextApiRequest;
	res: NextApiResponse;
	logger: Logger;
	debug: boolean;
};

export type AuthorizedContext = UnauthorizedContext & {
	auth: {
		sessionId: string;
		accountId: AccountsId;
	};
};

export const createContext = (
	opts: trpcNext.CreateNextContextOptions
): UnauthorizedContext => ({
	req: opts.req,
	res: opts.res,
	logger,
	debug: Boolean(opts.req.headers.debug),
});
