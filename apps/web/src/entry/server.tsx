/// <reference types="vite/client" />
import * as Sentry from "@sentry/tanstackstart-react";
import {
	createStartHandler,
	defaultStreamHandler,
	parseCookies,
} from "@tanstack/react-start/server";

// Import is needed to apply Nativewind remaps to default components
import "~app/utils/nativewind";
import { getStoreValuesFromInitialValues } from "~app/utils/store-data";
import type { ExternalRouterContext } from "~web/pages/__root";

import type { TreeRouter } from "./router";
import { createRouter } from "./router";

const getExternalContext = (): ExternalRouterContext => {
	const cookies = parseCookies();
	const initialValues = getStoreValuesFromInitialValues(cookies);
	return { initialValues };
};

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({ dsn: sentryDsn, tracesSampleRate: 1.0 });
}

const wrappedStreamHandler =
	Sentry.wrapStreamHandlerWithSentry(defaultStreamHandler);

const eventHandler = createStartHandler<TreeRouter>({
	createRouter: () => createRouter(getExternalContext()),
})(wrappedStreamHandler);

export default eventHandler;
