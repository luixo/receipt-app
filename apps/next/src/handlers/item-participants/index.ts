import * as trpc from "@trpc/server";
import { AuthorizedContext } from "../context";
import { router as updateRouter } from "./update";
import { router as putRouter } from "./put";
import { router as deleteRouter } from "./delete";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(updateRouter)
	.merge(putRouter)
	.merge(deleteRouter);
