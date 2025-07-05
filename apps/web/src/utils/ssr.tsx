import type React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { ResolverDef, TRPCQueryOptions } from "@trpc/tanstack-react-query";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useMountEffect } from "~app/hooks/use-mount-effect";
import type { RouterContext } from "~web/pages/__root";

export const prefetch = (
	context: RouterContext,
	...optionsSet: ReturnType<TRPCQueryOptions<ResolverDef>>[]
) =>
	optionsSet.map((options) => ({
		queryKey: options.queryKey,
		promise: context.queryClient.fetchQuery(options),
	}));

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
				queryFn: () => query.promise,
			});
		});
	}
	return <>{children}</>;
};
