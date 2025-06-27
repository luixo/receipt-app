/// <reference types="vinxi/types/client" />
import * as Sentry from "@sentry/tanstackstart-react";
import { StartClient } from "@tanstack/react-start";
import { hydrateRoot } from "react-dom/client";
import { fromEntries } from "remeda";

// Import is needed to apply Nativewind remaps to default components
import "~app/utils/nativewind";
import { getStoreValuesFromInitialValues } from "~app/utils/store-data";
import type { ExternalRouterContext } from "~web/pages/__root";

import { createRouter } from "./router";

const parseCookies = () =>
	fromEntries(
		document.cookie
			.split(";")
			.map(
				(cookie) =>
					cookie.trim().split("=").map(decodeURIComponent).slice(0, 2) as [
						string,
						string,
					],
			),
	);

const getContext = (): ExternalRouterContext => ({
	initialValues: getStoreValuesFromInitialValues(parseCookies()),
});

const router = createRouter(getContext());

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		tracesSampleRate: 1.0,
		integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
		// Adds request headers and IP for users, for more info visit:
		// https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
		sendDefaultPii: true,
	});
}

hydrateRoot(document, <StartClient router={router} />);
