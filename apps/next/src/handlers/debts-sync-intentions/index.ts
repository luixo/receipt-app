import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as acceptRouter } from "./accept";
import { router as addRouter } from "./add";
import { router as getAllRouter } from "./get-all";
import { router as rejectRouter } from "./reject";
import { router as removeRouter } from "./remove";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getAllRouter)
	.merge(addRouter)
	.merge(removeRouter)
	.merge(acceptRouter)
	.merge(rejectRouter);
