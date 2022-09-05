import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as addRouter } from "./add";
import { router as getRouter } from "./get";
import { router as getByReceiptIdRouter } from "./get-by-receipt-id";
import { router as getByUsersRouter } from "./get-by-users";
import { router as getReceiptRouter } from "./get-receipt";
import { router as getUserRouter } from "./get-user";
import { router as removeRouter } from "./remove";
import { router as updateRouter } from "./update";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getByUsersRouter)
	.merge(getUserRouter)
	.merge(getReceiptRouter)
	.merge(getRouter)
	.merge(updateRouter)
	.merge(removeRouter)
	.merge(addRouter)
	.merge(getByReceiptIdRouter);
