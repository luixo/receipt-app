import * as trpc from "@trpc/server";

import { UnauthorizedContext } from "next-app/handlers/context";

import { router as addRouter } from "./add";
import { router as cleanupRouter } from "./cleanup";
import { router as getRouter } from "./get";

export const router = trpc
	.router<UnauthorizedContext>()
	.merge(getRouter)
	.merge(addRouter)
	.merge(cleanupRouter);
