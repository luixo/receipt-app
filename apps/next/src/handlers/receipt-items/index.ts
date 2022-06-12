import * as trpc from "@trpc/server";
import { AuthorizedContext } from "../context";
import { router as getRouter } from "./get";
import { router as putRouter } from "./put";
import { router as deleteRouter } from "./delete";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(putRouter)
	.merge(deleteRouter);
