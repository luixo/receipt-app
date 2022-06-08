import * as trpc from "@trpc/server";
import { router as previewsRouter } from "./previews";
import { router as itemsRouter } from "./items";
import { Context } from "../context";

export const router = trpc
	.router<Context>()
	.merge(previewsRouter)
	.merge(itemsRouter);
