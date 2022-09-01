import * as trpc from "@trpc/server";

import { AuthorizedContext } from "next-app/handlers/context";

import { router as deleteRouter } from "./delete";
import { router as getRouter } from "./get";
import { router as getNameRouter } from "./get-name";
import { router as getNonResolvedAmountRouter } from "./get-non-resolved-amount";
import { router as getPagedRouter } from "./get-paged";
import { router as getResolvedParticipantsRouter } from "./get-resolved-participants";
import { router as propagateDebtsRouter } from "./propagate-debts";
import { router as putRouter } from "./put";
import { router as updateRouter } from "./update";
import { router as updateDebtRouter } from "./update-debt";

export const router = trpc
	.router<AuthorizedContext>()
	.merge(getRouter)
	.merge(getPagedRouter)
	.merge(deleteRouter)
	.merge(putRouter)
	.merge(updateRouter)
	.merge(getNameRouter)
	.merge(getResolvedParticipantsRouter)
	.merge(propagateDebtsRouter)
	.merge(updateDebtRouter)
	.merge(getNonResolvedAmountRouter);
