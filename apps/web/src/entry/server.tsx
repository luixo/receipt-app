/// <reference types="vite/client" />
import "./prelude";
import { createElement } from "react";

import * as Sentry from "@sentry/tanstackstart-react";
import type { AnyRouter } from "@tanstack/react-router";
import {
	createSsrStreamResponse,
	transformReadableStreamWithRouter,
} from "@tanstack/react-router/ssr/server";
import type { HandlerCallback } from "@tanstack/react-router/ssr/server";
import { StartServer } from "@tanstack/react-start-server";
import { createStartHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import ReactDOMServer from "react-dom/server";

import type { TreeRouter } from "./router";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({ dsn: sentryDsn, tracesSampleRate: 1 });
}

// Adapted from TanStack's renderRouterToStream, logging only the error message
// instead of React's ~100 line component stack:
// https://github.com/TanStack/router/blob/main/packages/react-router/src/ssr/renderRouterToStream.tsx
const renderServerStream: HandlerCallback<AnyRouter> = async ({
	request,
	router,
	responseHeaders,
}) => {
	const stream = await ReactDOMServer.renderToReadableStream(
		createElement(StartServer, { router }),
		{
			signal: request.signal,
			nonce: router.options.ssr?.nonce,
			progressiveChunkSize: Number.POSITIVE_INFINITY,
			onError: (error) => {
				if (error instanceof Error && error.name === "AbortError") {
					return;
				}
				// oxlint-disable-next-line no-console
				console.error(
					`Error in renderToReadableStream: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			},
		},
	);
	const responseStream = transformReadableStreamWithRouter(
		router,
		stream as unknown as NodeReadableStream,
		{
			onAbort: () => {
				stream.cancel().catch(() => undefined);
			},
		},
	);
	return createSsrStreamResponse(
		router,
		new Response(responseStream as unknown as BodyInit, {
			status: router.stores.statusCode.get(),
			headers: responseHeaders,
		}),
	);
};

const fetch = createStartHandler<TreeRouter>(renderServerStream);

export default createServerEntry({ fetch });
