/// <reference types="vite/client" />
import "./prelude";
import * as Sentry from "@sentry/tanstackstart-react";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";

import type { TreeRouter } from "./router";
import { createRouter } from "./router";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({ dsn: sentryDsn, tracesSampleRate: 1 });
}

const wrappedStreamHandler =
	Sentry.wrapStreamHandlerWithSentry(defaultStreamHandler);

const eventHandler = createStartHandler<TreeRouter>({
	createRouter: () => createRouter(),
})(wrappedStreamHandler);

export default eventHandler;
