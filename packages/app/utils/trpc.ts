import * as Sentry from "@sentry/nextjs";
import type { QueryClientConfig } from "@tanstack/react-query";
import type {
	HTTPBatchLinkOptions,
	HTTPLinkOptions,
	TRPCLink,
} from "@trpc/client";
import {
	TRPCClientError,
	experimental_formDataLink,
	httpBatchLink,
	httpLink,
	splitLink,
} from "@trpc/client";
import type { AwaitPrepassRender } from "@trpc/next";
import type { AnyRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import type { NextPageContext } from "next";
import superjson from "superjson";

import { MINUTE, SECOND } from "app/utils/time";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";

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

export type LinkHeaders = HTTPLinkOptions["headers"] &
	HTTPBatchLinkOptions["headers"];

export const getLinks = (
	url: string,
	{
		useBatch,
		keepError,
		headers,
	}: {
		useBatch?: boolean;
		keepError?: boolean;
		headers?: LinkHeaders;
	} = {},
): TRPCLink<AppRouter>[] => {
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

export const transformer = superjson;

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
