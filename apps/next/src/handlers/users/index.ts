import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as addRouter } from "./add";
import { router as getRouter } from "./get";
import { router as getNameRouter } from "./get-name";
import { router as getPagedRouter } from "./get-paged";
import { router as hasConnectedAccountRouter } from "./has-connected-account";
import { router as removeRouter } from "./remove";
import { router as suggestRouter } from "./suggest";
import { router as suggestTopRouter } from "./suggest-top";
import { router as unlinkRouter } from "./unlink";
import { router as updateRouter } from "./update";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(getPagedRouter)
	.merge(addRouter)
	.merge(removeRouter)
	.merge(updateRouter)
	.merge(getNameRouter)
	.merge(unlinkRouter)
	.merge(hasConnectedAccountRouter)
	.merge(suggestRouter)
	.merge(suggestTopRouter);
