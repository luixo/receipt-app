import * as trpc from "@trpc/server";
import { AuthorizedContext } from "../context";

import { router as getRouter } from "./get";
import { router as logoutRouter } from "./logout";
import { router as changePasswordRouter } from "./change-password";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(logoutRouter)
	.merge(changePasswordRouter);
