import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as deleteRouter } from "./delete";
import { router as getRouter } from "./get";
import { router as getByUsersRouter } from "./get-by-users";
import { router as getUserRouter } from "./get-user";
import { router as putRouter } from "./put";
import { router as updateRouter } from "./update";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getByUsersRouter)
	.merge(getUserRouter)
	.merge(getRouter)
	.merge(updateRouter)
	.merge(deleteRouter)
	.merge(putRouter);
