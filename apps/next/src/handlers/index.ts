import * as trpc from "@trpc/server";
import superjson from "superjson";

import { UnauthorizedContext } from "./context";
import { middleware as verifyAuthorizedMiddleware } from "./middlewares/authorization";
import { middleware as loggerMiddleware } from "./middlewares/logger";

import { router as authRouter } from "./auth";
import { router as accountRouter } from "./account/index";
import { router as receiptsRouter } from "./receipts/index";
import { router as receiptItemsRouter } from "./receipt-items/index";
import { router as usersRouter } from "./users/index";
import { router as receiptParticipantsRouter } from "./receipt-participants/index";
import { router as currencyRouter } from "./currency/index";
import { router as itemParticipantsRouter } from "./item-participants/index";

export const router = trpc
	.router<UnauthorizedContext>()
	.transformer(superjson)
	.middleware(loggerMiddleware)
	.merge("auth.", authRouter)
	.middleware(verifyAuthorizedMiddleware)
	.merge("account.", accountRouter)
	.merge("receipts.", receiptsRouter)
	.merge("receipt-items.", receiptItemsRouter)
	.merge("users.", usersRouter)
	.merge("receipt-participants.", receiptParticipantsRouter)
	.merge("currency.", currencyRouter)
	.merge("item-participants.", itemParticipantsRouter);
