import * as trpc from "@trpc/server";
import superjson from "superjson";

import { UnauthorizedContext } from "./context";
import { middleware as verifyAuthorizedMiddleware } from "./middlewares/authorization";
import { middleware as loggerMiddleware } from "./middlewares/logger";

import { router as authRouter } from "./auth";
import { router as accountRouter } from "./account/index";
import { router as receiptsRouter } from "./receipts/index";

export const router = trpc
	.router<UnauthorizedContext>()
	.transformer(superjson)
	.middleware(loggerMiddleware)
	.merge("auth.", authRouter)
	.middleware(verifyAuthorizedMiddleware)
	.merge("account.", accountRouter)
	.merge("receipts.", receiptsRouter);
