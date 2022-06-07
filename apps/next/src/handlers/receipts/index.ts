import * as trpc from "@trpc/server";
import { router as previewsRouter } from "./previews";
import { router as itemsRouter } from "./items";

export const router = trpc.router().merge(previewsRouter).merge(itemsRouter);
