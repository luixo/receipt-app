import type React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import type { ResolverDef, TRPCQueryOptions } from "@trpc/tanstack-react-query";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useMountEffect } from "~app/hooks/use-mount-effect";
import { transformer } from "~app/utils/trpc";
import type { RouterContext } from "~web/pages/__root";

// see https://github.com/TanStack/router/issues/4084
const ERROR_TAG = "__error__";

export const prefetch = (
	ctx: { context: RouterContext },
	...optionsSet: ReturnType<TRPCQueryOptions<ResolverDef>>[]
) => {
	if (!import.meta.env.SSR) {
		return [];
	}
	return optionsSet.map((options) => ({
		queryKey: options.queryKey,
		promise: ctx.context.queryClient
			.fetchQuery(options)
			.catch((error) => ({ [ERROR_TAG]: true, message: String(error) }))
			.then(transformer.serialize),
	}));
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
	}
	return <>{children}</>;
};
