import * as trpcNext from "@trpc/server/adapters/next";

import { router } from "next-app/handlers";
import { createContext } from "next-app/handlers/context";

export type AppRouter = typeof router;

export default trpcNext.createNextApiHandler({
	router,
	createContext,
});
