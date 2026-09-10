import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { useMountEffect } from "~app/hooks/use-mount-effect";

/*
Route loaders fetch into the router's queryClient while mutations write into
the local (app) queryClient, so a freshly written record is invisible to the
loader of the route being navigated to. Seed the router's client with the
app's cached data before loaders run.
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
				.filter(
					({ queryKey, state }) =>
						state.data !== undefined &&
						routerQueryClient.getQueryData(queryKey) === undefined,
				);
			for (const { queryKey, state } of cachedQueries) {
				routerQueryClient.setQueryData(queryKey, state.data, {
					updatedAt: state.dataUpdatedAt,
				});
			}
		}),
	);
};
