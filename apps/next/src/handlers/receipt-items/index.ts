import * as trpc from "@trpc/server";
import { AuthorizedContext } from "../context";
import { router as getRouter } from "./get";

export const router = trpc.router<AuthorizedContext>().merge(getRouter);
