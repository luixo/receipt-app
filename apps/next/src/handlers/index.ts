import * as trpc from "@trpc/server";
import { Context } from "./context";

import { router as receiptsRouter } from "./receipts/index";

export const router = trpc.router<Context>().merge("receipts.", receiptsRouter);
