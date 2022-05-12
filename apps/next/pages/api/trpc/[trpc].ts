import * as trpcNext from "@trpc/server/adapters/next";
import { router } from "../../../handlers";

export type AppRouter = typeof router;

export default trpcNext.createNextApiHandler({
	router,
});
