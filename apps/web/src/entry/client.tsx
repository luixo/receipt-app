/// <reference types="vite/client" />
import React from "react";

import * as Sentry from "@sentry/tanstackstart-react";
import { StartClient } from "@tanstack/react-start";
import { hydrateRoot } from "react-dom/client";

import { createRouter } from "./router";

const router = createRouter();

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		tracesSampleRate: 1,
		integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
		// Adds request headers and IP for users, for more info visit:
		// https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
		sendDefaultPii: true,
	});
}

React.startTransition(() => {
	const client = <StartClient router={router} />;
	hydrateRoot(
		document,
		import.meta.env.MODE === "test" ? (
			client
		) : (
			<React.StrictMode>{client}</React.StrictMode>
		),
	);
});
