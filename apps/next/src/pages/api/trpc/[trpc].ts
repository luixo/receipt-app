import * as trpcNext from "@trpc/server/adapters/next";

import { router } from "../../../handlers";
import { createContext } from "../../../handlers/context";

export type AppRouter = typeof router;

export default trpcNext.createNextApiHandler({
	router,
	createContext,
});
