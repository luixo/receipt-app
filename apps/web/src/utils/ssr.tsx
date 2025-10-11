import type React from "react";

import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import type { ResolverDef, TRPCQueryOptions } from "@trpc/tanstack-react-query";
import { isNonNullish } from "remeda";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useMountEffect } from "~app/hooks/use-mount-effect";
import { transformer } from "~utils/transformer";
import type { RouterContext } from "~web/pages/__root";

// see https://github.com/TanStack/router/issues/4084
const ERROR_TAG = "__error__";

type PrefetchContext = { context: RouterContext };
const prefetchQuery = (
	ctx: PrefetchContext,
	options: ReturnType<TRPCQueryOptions<ResolverDef>>,
) => ({
	queryKey: options.queryKey,
	promise: ctx.context.queryClient
		.fetchQuery(options)
		.catch((error) => ({ [ERROR_TAG]: true, message: String(error) }))
		.then(transformer.serialize),
});

export const prefetchQueries = (
	ctx: PrefetchContext,
	...optionsSet: ReturnType<TRPCQueryOptions<ResolverDef>>[]
) => {
	if (!import.meta.env.SSR) {
		return [];
	}
	return optionsSet.map((options) => prefetchQuery(ctx, options));
};

class SerializedTRPCError extends Error {
	queryKey: QueryKey;
	errorObject: Error;
	constructor(queryKey: QueryKey, errorObject: Error) {
		super(errorObject.message);
		this.queryKey = queryKey;
		this.errorObject = errorObject;
	}
}

export const prefetchQueriesWith = async <T,>(
	ctx: PrefetchContext,
	getPromise: () => Promise<T>,
	getOptions: (result: T) => ReturnType<TRPCQueryOptions<ResolverDef>>[],
) => {
	if (!import.meta.env.SSR) {
		return [];
	}
	try {
		const result = await getPromise();
		return getOptions(result).map((options) => prefetchQuery(ctx, options));
	} catch {
		return [];
	}
};

export const HydrationBoundary: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const prefetchedQueries = useRouterState({
		select: (state) =>
			state.matches.flatMap((match) =>
				typeof match.loaderData === "object" && "prefetched" in match.loaderData
					? match.loaderData.prefetched
					: [],
			),
	});
	const matchErrors = useRouterState({
		select: (state) =>
			state.matches.map((match) => match.error).filter(isNonNullish),
	});
	const localQueryClient = useQueryClient();
	const [isMounted, { setTrue: setMounted }] = useBooleanState();
	useMountEffect(setMounted);
	if (!isMounted) {
		prefetchedQueries.forEach((query) => {
			void localQueryClient.prefetchQuery({
				queryKey: query.queryKey,
				queryFn: () =>
					query.promise
						.then(transformer.deserialize)
						.then((result: unknown) => {
							if (
								typeof result === "object" &&
								result &&
								ERROR_TAG in result &&
								"message" in result &&
								typeof result.message === "string"
							) {
								throw new TRPCClientError(result.message);
							}
							return result;
						}),
			});
		});
		matchErrors.forEach((error) => {
			if (!("errorObject" in error)) {
				return;
			}
			const castedError = error as SerializedTRPCError;
			const serializedError = new SerializedTRPCError(
				castedError.queryKey,
				castedError.errorObject,
			);
			void localQueryClient.prefetchQuery({
				queryKey: serializedError.queryKey,
				queryFn: () => {
					throw serializedError.errorObject;
				},
			});
		});
	}
	return <>{children}</>;
};
