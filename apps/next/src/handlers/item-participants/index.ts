import * as trpc from "@trpc/server";
import { AuthorizedContext } from "../context";
import { router as updateRouter } from "./update";

export const router = trpc.router<AuthorizedContext>().merge(updateRouter);
