import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as acceptRouter } from "./accept";
import { router as deleteRouter } from "./delete";
import { router as getAllRouter } from "./get-all";
import { router as putRouter } from "./put";
import { router as rejectRouter } from "./reject";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getAllRouter)
	.merge(putRouter)
	.merge(acceptRouter)
	.merge(deleteRouter)
	.merge(rejectRouter);
