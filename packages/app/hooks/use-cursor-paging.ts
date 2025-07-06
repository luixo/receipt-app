import React from "react";

import type { SkipToken, UseQueryResult } from "@tanstack/react-query";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SearchParamState } from "~app/hooks/use-navigation";
import type {
	TRPCDecoratedInfiniteQueryProcedure,
	TRPCError,
	TRPCInfiniteQueryKey,
} from "~app/trpc";
import { updateSetStateAction } from "~utils/react";

export const useCursorPaging = <
	K extends TRPCInfiniteQueryKey,
	P extends
		TRPCDecoratedInfiniteQueryProcedure<K> = TRPCDecoratedInfiniteQueryProcedure<K>,
	I extends Exclude<Parameters<P["queryOptions"]>[0], SkipToken> = Exclude<
		Parameters<P["queryOptions"]>[0],
		SkipToken
	>,
>(
	procedure: P,
	input: Omit<I, "cursor">,
	offsetState: SearchParamState<"/receipts", "offset">,
) => {
	const { limit } = input;
	const [offset, setOffset] = offsetState;
	const query = useQuery(
		// This is hacky, but I couldn't manage types here
		(
			procedure as TRPCDecoratedInfiniteQueryProcedure<"users.getPaged">
		).queryOptions(
			{ ...input, cursor: offset },
			{ placeholderData: keepPreviousData },
		),
	);

	const totalCount = query.data?.count;
	React.useEffect(() => {
		const maxOffset =
			typeof totalCount === "number"
				? totalCount === 0
					? 0
					: (Math.ceil(totalCount / limit) - 1) * limit
				: undefined;
		if (maxOffset === undefined) {
			return;
		}
		if (offset > maxOffset) {
			void setOffset(maxOffset, { replace: true });
		}
	}, [setOffset, totalCount, limit, offset]);

	return {
		query: query as UseQueryResult<P["~types"]["output"], TRPCError>,
		onPageChange: React.useCallback<
			React.Dispatch<React.SetStateAction<number>>
		>(
			(setStateAction: React.SetStateAction<number>) =>
				setOffset((prevOffset) => {
					const prevPage = Math.floor(prevOffset / limit) + 1;
					const nextPage = updateSetStateAction(setStateAction, prevPage);
					return (nextPage - 1) * limit;
				}),
			[setOffset, limit],
		),
		isPending: query.fetchStatus === "fetching" && query.isPlaceholderData,
	};
};
