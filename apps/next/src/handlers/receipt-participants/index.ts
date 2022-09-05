import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as addRouter } from "./add";
import { router as removeRouter } from "./remove";
import { router as updateRouter } from "./update";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(addRouter)
	.merge(removeRouter)
	.merge(updateRouter);
