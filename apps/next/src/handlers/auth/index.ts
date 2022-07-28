import * as trpc from "@trpc/server";

import { UnauthorizedContext } from "next-app/handlers/context";

import { router as confirmEmailRouter } from "./confirm-email";
import { router as loginRouter } from "./login";
import { router as registerRouter } from "./register";
import { router as resetPasswordRouter } from "./reset-password";
import { router as voidAccountRouter } from "./void-account";

export const router = trpc
	.router<UnauthorizedContext>()
	.merge(loginRouter)
	.merge(registerRouter)
	.merge(resetPasswordRouter)
	.merge(confirmEmailRouter)
	.merge(voidAccountRouter);
