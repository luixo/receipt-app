import * as Sentry from "@sentry/nextjs";
import * as trpcNext from "@trpc/server/adapters/next";

import { router } from "next-app/handlers";
import { createContext } from "next-app/handlers/context";

export type AppRouter = typeof router;

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 1.0 });

export default Sentry.withSentry(
	trpcNext.createNextApiHandler({
		router,
		createContext,
	})
);

export const config = {
	api: {
		externalResolver: true,
	},
};
