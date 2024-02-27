import React from "react";

import type { DehydratedState, QueryClient } from "@tanstack/react-query";
import { dehydrate, useQueryClient } from "@tanstack/react-query";

import { alwaysTrue } from "~app/utils/utils";

declare global {
	interface Window {
		getDehydratedCache: (timeout: number) => Promise<DehydratedState>;
		queryClient: QueryClient;
	}
}

export const useQueryClientHelper = () => {
	const queryClient = useQueryClient();
	React.useEffect(() => {
		if (process.env.NEXT_PUBLIC_ENV !== "test") {
			return;
		}
		window.queryClient = queryClient;
		window.getDehydratedCache = async (timeout: number) => {
			const getData = () =>
				dehydrate(queryClient, {
					shouldDehydrateQuery: alwaysTrue,
					shouldDehydrateMutation: alwaysTrue,
				});
			return new Promise((resolve, reject) => {
				if (queryClient.isFetching()) {
					const unsub = window.queryClient.getQueryCache().subscribe(() => {
						if (!window.queryClient.isFetching()) {
							resolve(getData());
							unsub();
						}
					});
					setTimeout(reject, timeout);
					return;
				}
				resolve(getData());
			});
		};
	}, [queryClient]);
};
