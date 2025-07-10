import React from "react";

import type { QueryFilters } from "@tanstack/react-query";
import { matchQuery, useQueryClient } from "@tanstack/react-query";
import { funnel } from "remeda";

import type { TRPCQueryKey, TRPCTanstackGenericQueryKey } from "~app/trpc";

import { useGetMemoizedValue } from "./use-get-memoized-value";

export const useSubscribeToQueryUpdate = <K extends TRPCQueryKey, T>(
	{ key, filters }: { key: K; filters?: QueryFilters },
	getSnapshot: () => T,
	getServerSnapshot: () => T = getSnapshot,
) => {
	const queryClient = useQueryClient();
	const memoizedSnapshot = useGetMemoizedValue(getSnapshot);
	const memoizedServerSnapshot = useGetMemoizedValue(getServerSnapshot);
	return React.useSyncExternalStore(
		React.useCallback(
			(onStoreChange) => {
				const { call: debouncedStoreChange, cancel: cancelStoreChange } =
					funnel(onStoreChange, {
						minQuietPeriodMs: 100,
						maxBurstDurationMs: 1000,
						triggerAt: "both",
					});
				const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
					if (!["added", "removed", "updated"].includes(event.type)) {
						return;
					}
					const queryKey = event.query.queryKey as TRPCTanstackGenericQueryKey;
					if (queryKey[0].join(".") !== key) {
						return;
					}
					if (filters && !matchQuery(filters, event.query)) {
						return;
					}
					debouncedStoreChange();
				});
				return () => {
					unsubscribe();
					cancelStoreChange();
				};
			},
			[filters, key, queryClient],
		),
		memoizedSnapshot,
		memoizedServerSnapshot,
	);
};
