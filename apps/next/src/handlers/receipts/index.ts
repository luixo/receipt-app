import * as trpc from "@trpc/server";
import { router as previewsRouter } from "./previews";
import { router as itemsRouter } from "./items";
import { AuthorizedContext } from "../context";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(previewsRouter)
	.merge(itemsRouter);
