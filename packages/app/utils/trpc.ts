import type { QueryClientConfig } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/client";
import {
	TRPCClientError,
	unstable_httpBatchStreamLink as httpBatchStreamLink,
	httpLink,
	splitLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AnyTRPCRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { omitBy } from "remeda";
import superjson from "superjson";

import type { AppRouter } from "~app/trpc";
import { MINUTE } from "~utils";

export const transformer = superjson;
export type TransformerResult = ReturnType<(typeof transformer)["serialize"]>;

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

export type SearchParams = Record<string, string | string[] | undefined>;
export type Headers = Partial<Record<string, string>>;

export type GetLinksOptions = {
	url: string;
	useBatch?: boolean;
	keepError?: boolean;
	headers?: Headers;
	captureError: (error: TRPCClientError<AppRouter>) => string;
	source: // Next.js client-side rendering originated from 'pages' dir
	| "csr-next"
		// React Native environment (Expo)
		| "native"
		// Originated from artificial testing environment
		| "test"
		// Next.js api call from server-side code (probably, api handler call)
		| "api-next"
		// Default unset value in context
		| "unset";
};

export const getLinks = (
	searchParams: SearchParams,
	{
		url,
		useBatch,
		keepError,
		source,
		captureError,
		headers: overrideHeaders,
	}: GetLinksOptions,
): TRPCLink<AppRouter>[] => {
	// we omit to not let stringified "undefined" get passed to the server
	const headers = omitBy(
		{
			"x-debug": searchParams.debug ? "true" : undefined,
			"x-proxy-port": Number.isNaN(Number(searchParams.proxyPort))
				? undefined
				: Number(searchParams.proxyPort).toString(),
			"x-controller-id":
				typeof searchParams.controllerId === "string"
					? searchParams.controllerId
					: undefined,
			"x-source": source,
			...overrideHeaders,
		},
		(value) => value === undefined,
	);
	const splitLinkInstance = splitLink({
		condition: (op) => op.input instanceof FormData,
		true: httpLink({ url, headers }),
		false: splitLink({
			condition: (op) =>
				Boolean(useBatch && op.context.batch !== noBatchContext.batch),
			true: httpBatchStreamLink({ url, headers, transformer }),
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
							`Internal server error\nError fingerprint "${transactionId}"`,
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
			retryOnMount: false,
			staleTime: MINUTE,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		},
	},
});

export const trpcReact = createTRPCReact<AppRouter>();
