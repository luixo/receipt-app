import * as trpc from "@trpc/server";

import { AuthorizedContext } from "../context";

import { router as getListRouter } from "./get-list";

export const router = trpc.router<AuthorizedContext>().merge(getListRouter);
