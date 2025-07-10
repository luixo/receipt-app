import type { QueryClientConfig } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/client";
import {
	TRPCClientError,
	httpBatchStreamLink,
	httpLink,
	splitLink,
} from "@trpc/client";
import type { AnyTRPCRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { omitBy } from "remeda";

import type { AppRouter } from "~app/trpc";
import { serializeDuration } from "~utils/date";
import { transformer } from "~utils/transformer";

type UnexpectedErrorLinkOptions<Router extends AnyTRPCRouter> = {
	mapper: (error: TRPCClientError<Router>) => TRPCClientError<Router>;
};

const mapError =
	<Router extends AnyTRPCRouter>({
		mapper,
	}: UnexpectedErrorLinkOptions<Router>): TRPCLink<Router> =>
	() =>
	({ next, op }) =>
		observable((observer) =>
			next(op).subscribe({
				next: (value) => observer.next(value),
				error: (error) => observer.error(mapper(error)),
				complete: () => observer.complete(),
			}),
		);

declare module "@trpc/client" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface OperationContext {
		batch: symbol;
	}
}

export const noBatchContext = { batch: Symbol("no-batch") };

export type Headers = Partial<Record<string, string>>;

export type GetLinksOptions = {
	url: string;
	debug?: boolean;
	useBatch?: boolean;
	keepError?: boolean;
	headers?: Headers;
	captureError: (error: TRPCClientError<AppRouter>) => string;
	source: // Client-side rendering
	| "csr"
		// Client-side rendering via loader
		| "csr-loader"
		// Server-side rendering
		| "ssr"
		// Server-side rendering via loader
		| "ssr-loader"
		// React Native environment
		| "native"
		// Originated from artificial testing environment
		| "test"
		// API call from server-side code
		| "api"
		// Default unset value in context
		| "unset";
};

export const getLinks = ({
	url,
	debug,
	useBatch,
	keepError,
	source,
	captureError,
	headers: extraHeaders,
}: GetLinksOptions): TRPCLink<AppRouter>[] => {
	// we omit to not let stringified "undefined" get passed to the server
	const headers = omitBy(
		{
			...extraHeaders,
			"x-debug": debug ? "true" : undefined,
			"x-source": source,
		},
		(value) => value === undefined,
	);
	const splitLinkInstance = splitLink({
		condition: (op) => op.input instanceof FormData,
		true: httpLink({
			url,
			headers,
			transformer: {
				serialize: transformer.serialize,
				deserialize: transformer.deserialize,
			},
		}),
		false: splitLink({
			condition: (op) =>
				Boolean(useBatch && op.context.batch !== noBatchContext.batch),
			true: httpBatchStreamLink({
				url,
				headers,
				transformer,
				// Experimentally: 15k is ok
				maxURLLength: 14000,
			}),
			false: httpLink({ url, headers, transformer }),
		}),
	});
	if (keepError) {
		return [splitLinkInstance];
	}
	return [
		mapError({
			mapper: (error) => {
				if (
					error instanceof TRPCClientError &&
					error.meta?.response instanceof Response &&
					error.meta.response.status !== 200
				) {
					const transactionId = captureError(error);
					return TRPCClientError.from(
						new Error(
							[
								"Internal server error",
								`Error fingerprint "${transactionId}"`,
								...(import.meta.env.MODE === "test"
									? [error.message, error.stack]
									: []),
							].join("\n"),
						),
						{ meta: error.meta },
					);
				}
				return error;
			},
		}),
		splitLinkInstance,
	];
};

export const getQueryClientConfig = (): QueryClientConfig => ({
	defaultOptions: {
		queries: {
			retry: false,
			retryOnMount: true,
			staleTime: serializeDuration({ minutes: 1 }),
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		},
	},
});

export const { TRPCProvider, useTRPC, useTRPCClient } =
	createTRPCContext<AppRouter>();
