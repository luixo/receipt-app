import * as trpc from "@trpc/server";

import { AuthorizedContext } from "../context";

import { router as deleteRouter } from "./delete";
import { router as putRouter } from "./put";
import { router as updateRouter } from "./update";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(updateRouter)
	.merge(putRouter)
	.merge(deleteRouter);
