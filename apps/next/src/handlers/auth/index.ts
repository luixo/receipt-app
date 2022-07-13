import * as trpc from "@trpc/server";

import { UnauthorizedContext } from "next-app/handlers/context";

import { router as loginRouter } from "./login";
import { router as registerRouter } from "./register";

export const router = trpc
	.router<UnauthorizedContext>()
	.merge(loginRouter)
	.merge(registerRouter);
