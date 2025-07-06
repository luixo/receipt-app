import type React from "react";

import { useQueryClient } from "@tanstack/react-query";
import type { LoaderFnContext } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import type { ResolverDef, TRPCQueryOptions } from "@trpc/tanstack-react-query";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useMountEffect } from "~app/hooks/use-mount-effect";
import type { RouterContext } from "~web/pages/__root";

// see https://github.com/TanStack/router/issues/4084
const ERROR_TAG = "__error__";

export const prefetch = (
	ctx: { context: RouterContext } & Pick<LoaderFnContext, "cause">,
	...optionsSet: ReturnType<TRPCQueryOptions<ResolverDef>>[]
) => {
	if (ctx.cause === "stay") {
		return [];
	}
	return optionsSet.map((options) => ({
		queryKey: options.queryKey,
		promise: ctx.context.queryClient.fetchQuery(options).catch((error) => ({
			[ERROR_TAG]: true,
			message: String(error),
		})),
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
					query.promise.then((result) => {
						if (ERROR_TAG in result) {
							throw new TRPCClientError(result.message);
						}
					}),
			});
		});
	}
	return <>{children}</>;
};
