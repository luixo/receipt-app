// on web, we provide trpc context via withTRPC wrapper in _app.tsx

import React from "react";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { TRPCQueryKey, TRPCQuery, TRPCSplitQueryKey } from "app/trpc";
import { createIDBStorage } from "app/utils/idb";
import { MONTH } from "app/utils/time";

const isKeyEqual = <K1 extends TRPCSplitQueryKey, K2 extends TRPCSplitQueryKey>(
	keyA: K1,
	keyB: K2,
) =>
	keyA.length === keyB.length &&
	keyA.every((element, index) => element === keyB[index]);

const PERSISTED_QUERIES: Readonly<TRPCSplitQueryKey>[] = [
	["currency", "getList"],
];

export const QueriesProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const queryClient = useQueryClient();
	const [persister] = React.useState(() =>
		createAsyncStoragePersister({
			storage: typeof window === "undefined" ? undefined : createIDBStorage(),
		}),
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
						return PERSISTED_QUERIES.some((persistedKey) =>
							isKeyEqual(persistedKey, trpcQuery.queryKey[0]),
						);
					},
				},
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
};
