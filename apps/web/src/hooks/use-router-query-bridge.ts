import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { useMountEffect } from "~app/hooks/use-mount-effect";

/*
Route loaders fetch into the router's queryClient while mutations write into
the local (app) queryClient, so optimistic data is invisible to the loader of
the route being navigated to. Seed the router's client with the app's cached
data before loaders run, preferring it whenever it isn't older than the
router's copy.
*/
export const useRouterQueryBridge = () => {
	const localQueryClient = useQueryClient();
	const router = useRouter();
	const routerQueryClient = router.options.context.queryClient;
	useMountEffect(() =>
		router.subscribe("onBeforeLoad", () => {
			const cachedQueries = localQueryClient
				.getQueryCache()
				.getAll()
				.filter(({ queryKey, state }) => {
					if (state.data === undefined) {
						return false;
					}
					const routerQuery = routerQueryClient
						.getQueryCache()
						.find({ queryKey });
					return (
						!routerQuery ||
						routerQuery.state.dataUpdatedAt <= state.dataUpdatedAt
					);
				});
			for (const { queryKey, state } of cachedQueries) {
				routerQueryClient.setQueryData(queryKey, state.data, {
					updatedAt: state.dataUpdatedAt,
				});
			}
		}),
	);
};
