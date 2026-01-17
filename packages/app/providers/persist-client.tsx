import React from "react";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useQueryClient } from "@tanstack/react-query";
import type { AsyncStorage } from "@tanstack/react-query-persist-client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import type { TRPCQuery, TRPCQueryKey, TRPCSplitQueryKey } from "~app/trpc";
import { serializeDuration } from "~utils/date";

const isKeyEqual = <
	T1 extends TRPCQueryKey,
	K1 extends TRPCSplitQueryKey<T1>,
	T2 extends TRPCQueryKey,
	K2 extends TRPCSplitQueryKey<T2>,
>(
	keyA: Readonly<K1>,
	keyB: Readonly<K2>,
) =>
	// Let's keep it in case deeper routing ever happens
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	keyA.length === keyB.length &&
	keyA.every((element, index) => element === keyB[index]);

const PERSISTED_QUERIES: Readonly<TRPCSplitQueryKey>[] = [
	["currency", "getList"],
];

export type Props = React.PropsWithChildren<{
	storage?: AsyncStorage;
}>;

export const PersisterProvider: React.FC<Props> = ({ storage, children }) => {
	const queryClient = useQueryClient();
	const persistOptions = React.useMemo<
		React.ComponentProps<typeof PersistQueryClientProvider>["persistOptions"]
	>(
		() => ({
			persister: createAsyncStoragePersister({ storage }),
			maxAge: serializeDuration({ months: 1 }),
			dehydrateOptions: {
				shouldDehydrateQuery: (query) => {
					const trpcQuery = query as unknown as TRPCQuery<TRPCQueryKey>;
					return PERSISTED_QUERIES.some((persistedKey) =>
						isKeyEqual(persistedKey, trpcQuery.queryKey[0]),
					);
				},
			},
		}),
		[storage],
	);
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={persistOptions}
		>
			{children}
		</PersistQueryClientProvider>
	);
};
