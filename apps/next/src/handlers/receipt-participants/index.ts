import * as trpc from "@trpc/server";
import { AuthorizedContext } from "../context";
import { router as putRouter } from "./put";
import { router as deleteRouter } from "./delete";
import { router as updateRouter } from "./update";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(putRouter)
	.merge(deleteRouter)
	.merge(updateRouter);
