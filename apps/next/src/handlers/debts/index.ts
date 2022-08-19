import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as getByUsersRouter } from "./get-by-users";

export const router = trpc.router<AuthorizedContext>().merge(getByUsersRouter);
