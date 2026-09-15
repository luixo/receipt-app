/// <reference types="vite/client" />
// Native `Temporal` is available in all modern browsers except Safari
import "~utils/temporal-polyfill";
import React from "react";

import * as Sentry from "@sentry/tanstackstart-react";
import { StartClient } from "@tanstack/react-start/client";
import { hydrateRoot } from "react-dom/client";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		tracesSampleRate: 1,
		dataCollection: {},
	});
}

React.startTransition(() => {
	const client = <StartClient />;
	hydrateRoot(
		document,
		import.meta.env.MODE === "test" ? (
			client
		) : (
			<React.StrictMode>{client}</React.StrictMode>
		),
	);
});
