import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { PersistStorageContext } from "~app/contexts/persist-storage-context";
import type { TRPCQuery, TRPCQueryKey, TRPCSplitQueryKey } from "~app/trpc";
import { MONTH } from "~app/utils/time";

const isKeyEqual = <K1 extends TRPCSplitQueryKey, K2 extends TRPCSplitQueryKey>(
	keyA: K1,
	keyB: K2,
) =>
	keyA.length === keyB.length &&
	keyA.every((element, index) => element === keyB[index]);

const PERSISTED_QUERIES: Readonly<TRPCSplitQueryKey>[] = [
	["currency", "getList"],
];

export const PersisterProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const persistStorageContext = React.useContext(PersistStorageContext);
	if (!persistStorageContext) {
		throw new Error(
			"Expected to have PersistStorageContext available in PersisterProvider",
		);
	}
	const queryClient = useQueryClient();
	const persistOptions = React.useMemo<
		React.ComponentProps<typeof PersistQueryClientProvider>["persistOptions"]
	>(
		() => ({
			persister: persistStorageContext.persister,
			maxAge: MONTH,
			dehydrateOptions: {
				shouldDehydrateQuery: (query) => {
					const trpcQuery = query as unknown as TRPCQuery<TRPCQueryKey>;
					return PERSISTED_QUERIES.some((persistedKey) =>
						isKeyEqual(persistedKey, trpcQuery.queryKey[0]),
					);
				},
			},
		}),
		[persistStorageContext.persister],
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
