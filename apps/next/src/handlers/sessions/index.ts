import * as trpc from "@trpc/server";

import { UnauthorizedContext } from "next-app/handlers/context";

import { router as cleanupRouter } from "./cleanup";

export const router = trpc.router<UnauthorizedContext>().merge(cleanupRouter);
