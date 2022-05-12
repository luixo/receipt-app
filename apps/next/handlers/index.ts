import * as trpc from "@trpc/server";

import { router as receiptsRouter } from "./receipts/index";

export const router = trpc.router().merge("receipts.", receiptsRouter);
