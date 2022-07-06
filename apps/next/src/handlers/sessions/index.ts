import * as trpc from "@trpc/server";
import { UnauthorizedContext } from "../context";
import { router as cleanupRouter } from "./cleanup";

export const router = trpc.router<UnauthorizedContext>().merge(cleanupRouter);
