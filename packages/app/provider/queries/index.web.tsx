// on web, we provide trpc context via withTRPC wrapper in _app.tsx

import React from "react";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { TRPCQueryKey, TRPCQuery } from "app/trpc";
import { createIDBStorage } from "app/utils/idb";
import { MONTH } from "app/utils/time";

export const QueriesProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const queryClient = useQueryClient();
	const [persister] = React.useState(() =>
		createAsyncStoragePersister({
			storage: typeof window === "undefined" ? undefined : createIDBStorage(),
		})
	);
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister,
				maxAge: MONTH,
				dehydrateOptions: {
					shouldDehydrateQuery: (query) => {
						const trpcQuery = query as unknown as TRPCQuery<TRPCQueryKey>;
						const [trpcKey] = trpcQuery.queryKey;
						if (trpcKey === "currency.getList") {
							return true;
						}
						return false;
					},
				},
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
};
