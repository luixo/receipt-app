import React from "react";

import { dehydrate, useQueryClient } from "@tanstack/react-query";

import { alwaysTrue } from "app/utils/utils";

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
					dehydrateQueries: true,
					dehydrateMutations: true,
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
