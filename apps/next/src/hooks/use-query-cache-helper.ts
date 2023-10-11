import React from "react";

import { dehydrate, useQueryClient } from "@tanstack/react-query";

import { alwaysTrue } from "app/utils/utils";

export const useQueryCacheHelper = () => {
	const queryClient = useQueryClient();
	React.useEffect(() => {
		if (process.env.NEXT_PUBLIC_ENV !== "test") {
			return;
		}
		window.getDehydratedCache = () =>
			dehydrate(queryClient, {
				dehydrateQueries: true,
				dehydrateMutations: true,
				shouldDehydrateQuery: alwaysTrue,
				shouldDehydrateMutation: alwaysTrue,
			});
		window.subscribeToQuery = (queryKey, subscriber) => {
			queryClient.getQueryCache().subscribe((queryCacheNotifyEvent) => {
				if (queryCacheNotifyEvent.query.queryKey[0].join(".") !== queryKey) {
					return;
				}
				subscriber(queryCacheNotifyEvent);
			});
		};
	}, [queryClient]);
};
