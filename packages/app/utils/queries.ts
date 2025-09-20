import type {
	DefaultError,
	EnsureQueryDataOptions,
	Query,
	QueryClient,
	QueryKey,
} from "@tanstack/react-query";

import type {
	TRPCError,
	TRPCQueryKey,
	TRPCQueryOutput,
	TRPCTanstackQueryKey,
} from "~app/trpc";

export type EmptyMutateOptions = {
	onSuccess?: () => void;
	onError?: () => void;
	onSettled?: () => void;
};

// This is needed for generic infer
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const typeQuery = <K extends TRPCQueryKey>(query: Query, _key: K) =>
	query as unknown as Query<
		TRPCQueryOutput<K>,
		TRPCError,
		TRPCQueryOutput<K>,
		TRPCTanstackQueryKey<K>
	>;

export const ensureQueryDataOrError = async <
	TQueryFnData,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	queryClient: QueryClient,
	options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<{ data: TData } | { error: TError }> => {
	const queryState = queryClient.getQueryState<
		TQueryFnData,
		TError,
		TQueryKey,
		TData
	>(options.queryKey);
	if (!queryState || queryState.status === "pending") {
		try {
			const data = await queryClient.ensureQueryData<
				TQueryFnData,
				TError,
				TData,
				TQueryKey
			>(options);
			return { data };
		} catch (error) {
			return { error: error as TError };
		}
	}
	switch (queryState.status) {
		case "error":
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return { error: queryState.error! };
		case "success":
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return { data: queryState.data! };
	}
};
