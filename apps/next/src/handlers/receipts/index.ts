import * as trpc from "@trpc/server";

import { AuthorizedContext } from "../context";
import { router as getRouter } from "./get";
import { router as getPagedRouter } from "./get-paged";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(getPagedRouter);
