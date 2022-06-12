import * as trpc from "@trpc/server";
import { AuthorizedContext } from "../context";
import { router as getRouter } from "./get";
import { router as getAvailableRouter } from "./get-available";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(getAvailableRouter);
