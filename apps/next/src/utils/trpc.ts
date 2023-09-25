import * as Sentry from "@sentry/nextjs";
import type { TRPCLink } from "@trpc/client";
import { TRPCClientError, httpBatchLink, httpLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import type { AnyRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import type { NextConfig, NextPageContext } from "next";
import getConfig from "next/config";
import superjson from "superjson";

import {
	TRPC_ENDPOINT,
	getQueryClientConfig,
	getSsrHost,
} from "app/utils/queries";
import { SECOND } from "app/utils/time";
import { omitUndefined } from "app/utils/utils";
import type { AppRouter } from "next-app/pages/api/trpc/[trpc]";
import { AUTH_COOKIE } from "next-app/utils/auth-cookie";
import { getCookie, serialize } from "next-app/utils/cookie";

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

export const trpcNext = createTRPCNext<
	AppRouter,
	{ hasDebug: boolean },
	NextPageContext & { timeoutPromise: Promise<true> }
>({
	config: ({ meta: { hasDebug }, ctx }) => {
		const isBrowser = typeof window !== "undefined";
		const authToken = ctx?.req ? getCookie(ctx.req, AUTH_COOKIE) : undefined;
		return {
			links: [
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
				(isBrowser ? httpBatchLink : httpLink)({
					url: isBrowser
						? TRPC_ENDPOINT
						: getSsrHost(
								(getConfig() as NextConfig).serverRuntimeConfig?.port ?? 0,
						  ),
					// undefined is stringified and passed to the server
					headers: omitUndefined({
						debug: hasDebug ? "true" : undefined,
						cookie: authToken ? serialize(AUTH_COOKIE, authToken) : undefined,
					}),
				}),
			],
			queryClientConfig: getQueryClientConfig(),
			transformer: superjson,
		};
	},
	meta: (ctx) => ({ hasDebug: Boolean(ctx.query.debug) }),
	ssr: true,
	awaitPrespassRender: async ({ queryClient, ctx }) => {
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
					// true for "SSR render is not resolved, need another render pass"
					resolve(false);
					unsub();
				}
			});
		});
		return Promise.race([prefetchPromise, ctx.timeoutPromise]);
	},
});
