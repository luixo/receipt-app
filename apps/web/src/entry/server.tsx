/// <reference types="vite/client" />
import "./prelude";
import * as Sentry from "@sentry/tanstackstart-react";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

import type { TreeRouter } from "./router";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({ dsn: sentryDsn, tracesSampleRate: 1 });
}

const fetch = createStartHandler<TreeRouter>(defaultStreamHandler);

export default createServerEntry({ fetch });
