import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as deleteRouter } from "./delete";
import { router as getRouter } from "./get";
import { router as putRouter } from "./put";
import { router as updateRouter } from "./update";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(putRouter)
	.merge(deleteRouter)
	.merge(updateRouter);
