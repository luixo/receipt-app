import React from "react";

import type { DehydratedState, QueryClient } from "@tanstack/react-query";
import { dehydrate, useQueryClient } from "@tanstack/react-query";

declare global {
	// external interface extension
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Window {
		getDehydratedCache?: (timeout: number) => Promise<DehydratedState>;
		queryClient?: QueryClient;
	}
}

export const useQueryClientHelper = () => {
	const queryClient = useQueryClient();
	React.useEffect(() => {
		if (import.meta.env.MODE !== "test") {
			return;
		}
		window.queryClient = queryClient;
		window.getDehydratedCache = async (timeout: number) => {
			const getData = () =>
				dehydrate(queryClient, {
					shouldDehydrateQuery: () => true,
					shouldDehydrateMutation: () => true,
				});
			return new Promise((resolve, reject) => {
				if (!window.queryClient) {
					return;
				}
				if (queryClient.isFetching()) {
					const unsub = window.queryClient.getQueryCache().subscribe(() => {
						if (!window.queryClient) {
							return;
						}
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
