import * as trpc from "@trpc/server";

import { AuthorizedContext } from "../context";

import { router as deleteRouter } from "./delete";
import { router as getRouter } from "./get";
import { router as getAvailableRouter } from "./get-available";
import { router as getPagedRouter } from "./get-paged";
import { router as putRouter } from "./put";
import { router as updateRouter } from "./update";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(getAvailableRouter)
	.merge(getPagedRouter)
	.merge(putRouter)
	.merge(deleteRouter)
	.merge(updateRouter);
