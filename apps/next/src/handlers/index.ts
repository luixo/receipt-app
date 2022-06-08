import * as trpc from "@trpc/server";
import { Context } from "./context";
import { middleware as loggerMiddleware } from "./middlewares/logger";

import { router as receiptsRouter } from "./receipts/index";

export const router = trpc
	.router<Context>()
	.middleware(loggerMiddleware)
	.merge("receipts.", receiptsRouter);
