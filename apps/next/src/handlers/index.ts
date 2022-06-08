import * as trpc from "@trpc/server";
import superjson from "superjson";

import { Context } from "./context";
import { middleware as loggerMiddleware } from "./middlewares/logger";

import { router as receiptsRouter } from "./receipts/index";

export const router = trpc
	.router<Context>()
	.transformer(superjson)
	.middleware(loggerMiddleware)
	.merge("receipts.", receiptsRouter);
