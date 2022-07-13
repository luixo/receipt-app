import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as changePasswordRouter } from "./change-password";
import { router as getRouter } from "./get";
import { router as logoutRouter } from "./logout";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(logoutRouter)
	.merge(changePasswordRouter);
