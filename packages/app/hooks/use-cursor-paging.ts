import React from "react";

import type { SkipToken, UseQueryResult } from "@tanstack/react-query";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SearchParamState } from "~app/hooks/use-navigation";
import type {
	TRPCDecoratedInfiniteQueryProcedure,
	TRPCError,
	TRPCInfiniteQueryKey,
} from "~app/trpc";

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
	const maxOffset = query.data
		? query.data.count === 0
			? 0
			: (Math.ceil(query.data.count / limit) - 1) * limit
		: undefined;

	React.useEffect(() => {
		if (maxOffset === undefined) {
			return;
		}
		if (offset > maxOffset) {
			void setOffset(maxOffset, { replace: true });
		}
	}, [setOffset, maxOffset, offset]);

	const onChange = React.useCallback(
		(page: number) => {
			void setOffset((page - 1) * limit);
		},
		[setOffset, limit],
	);
	const pagination = React.useMemo(
		() => ({
			onChange,
			page: query.data?.count === 0 ? 0 : offset / limit + 1,
			total:
				query.data === undefined
					? Infinity
					: Math.ceil(query.data.count / limit),
		}),
		[onChange, query.data, offset, limit],
	);
	return {
		query: query as UseQueryResult<P["~types"]["output"], TRPCError>,
		pagination,
		totalCount: query.data?.count,
	};
};
