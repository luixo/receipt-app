import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";
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

export const PersisterProvider: React.FC<
	React.PropsWithChildren<{
		persister: Persister;
	}>
> = ({ persister, children }) => {
	const queryClient = useQueryClient();
	const persistOptions = React.useMemo<
		React.ComponentProps<typeof PersistQueryClientProvider>["persistOptions"]
	>(
		() => ({
			persister,
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
		[persister],
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
