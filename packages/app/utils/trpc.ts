import * as Sentry from "@sentry/nextjs";
import type { QueryClientConfig } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/client";
import {
	TRPCClientError,
	experimental_formDataLink,
	httpBatchLink,
	httpLink,
	splitLink,
} from "@trpc/client";
import type { AwaitPrepassRender } from "@trpc/next";
import type { AnyRouter, DataTransformer } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import type { NextPageContext } from "next";
import superjson from "superjson";

import { MINUTE, SECOND } from "app/utils/time";
import { omitUndefined } from "app/utils/utils";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import { AUTH_COOKIE, serialize } from "next-app/utils/server-cookies";

const SSR_TIMEOUT = 3 * SECOND;

type UnexpectedErrorLinkOptions<Router extends AnyRouter> = {
	mapper: (error: TRPCClientError<Router>) => TRPCClientError<Router>;
};

const mapError =
	<Router extends AnyRouter>({
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

type GetLinksOptions = {
	useBatch?: boolean;
	keepError?: boolean;
	searchParams: Record<string, string | string[] | undefined>;
	cookies: Partial<Record<string, string>> | undefined;
	headers?: Partial<Record<string, string>>;
	source: // Next.js client-side rendering originated from 'pages' dir
	| "csr-next"
		// Next.js server-side rendering originated from 'pages' dir
		| "ssr-next"
		// React Native environment (Expo)
		| "native"
		// Originated from artificial testing environment
		| "test"
		// Next.js api call from server-side code (probably, api handler call)
		| "api-next";
};

export const getLinks = (
	url: string,
	{
		useBatch,
		keepError,
		searchParams,
		cookies,
		source,
		headers: overrideHeaders,
	}: GetLinksOptions,
): TRPCLink<AppRouter>[] => {
	const authToken = cookies ? cookies[AUTH_COOKIE] : undefined;
	// we omit to not let stringified "undefined" get passed to the server
	const headers = omitUndefined({
		cookie: authToken ? serialize(AUTH_COOKIE, authToken) : undefined,
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
	});
	const splitLinkInstance = splitLink({
		condition: (op) => op.input instanceof FormData,
		true: experimental_formDataLink({ url, headers }),
		false: (useBatch ? httpBatchLink : httpLink)({ url, headers }),
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
					const transactionId = Math.random().toString(36).slice(2, 9);
					Sentry.captureException(error, {
						tags: { transaction_id: transactionId },
					});
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

export const awaitPrepassRender: AwaitPrepassRender<
	NextPageContext & {
		timeoutPromise: Promise<boolean>;
	}
> = async ({ queryClient, ctx }) => {
	ctx.timeoutPromise =
		ctx.timeoutPromise ||
		new Promise((resolve) => {
			setTimeout(() => {
				void queryClient.cancelQueries();
				// true for "SSR render is resolved"
				resolve(true);
			}, SSR_TIMEOUT);
		});
	if (!queryClient.isFetching()) {
		return true;
	}

	const prefetchPromise = new Promise<false>((resolve) => {
		const unsub = queryClient.getQueryCache().subscribe((event) => {
			if (event.query.getObserversCount() === 0) {
				// false for "SSR render is not resolved, need another render pass"
				resolve(false);
				unsub();
			}
		});
	});
	return Promise.race([prefetchPromise, ctx.timeoutPromise]);
};

export const transformer: DataTransformer = superjson;
export type TransformerResult = ReturnType<(typeof transformer)["serialize"]>;

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
