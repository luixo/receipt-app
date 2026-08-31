import React from "react";

import type { DehydratedState, QueryClient } from "@tanstack/react-query";
import { dehydrate, useQueryClient } from "@tanstack/react-query";

import { transformer } from "~utils/transformer";

declare global {
	// external interface extension
	// oxlint-disable-next-line typescript/consistent-type-definitions
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
			const getData = () => {
				const dehydratedData = dehydrate(queryClient, {
					shouldDehydrateQuery: () => true,
					shouldDehydrateMutation: () => true,
					serializeData: (data) => transformer.serialize(data),
				});
				return {
					...dehydratedData,
					mutations: dehydratedData.mutations.map((mutation) => ({
						...mutation,
						state: {
							...mutation.state,
							variables: transformer.serialize(mutation.state.variables),
							data: transformer.serialize(mutation.state.data),
							// `context` carries the live `queryClient`/`trpc` client
							// instances (see use-trpc-mutation-options.ts), which
							// can't cross the page.evaluate() browser/server boundary.
							context: undefined,
						},
					})),
				};
			};
			return new Promise((resolve, reject) => {
				if (queryClient.isFetching()) {
					const unsub = queryClient.getQueryCache().subscribe(() => {
						if (!queryClient.isFetching()) {
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
