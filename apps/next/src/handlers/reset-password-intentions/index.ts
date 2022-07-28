import * as trpc from "@trpc/server";

import { UnauthorizedContext } from "next-app/handlers/context";

import { router as cleanupRouter } from "./cleanup";
import { router as getRouter } from "./get";
import { router as putRouter } from "./put";

export const router = trpc
	.router<UnauthorizedContext>()
	.merge(getRouter)
	.merge(putRouter)
	.merge(cleanupRouter);
