import React from "react";

import type { QueryObserverResult, SkipToken } from "@tanstack/react-query";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SearchParamState } from "~app/hooks/use-navigation";
import type {
	TRPCDecoratedInfiniteQueryProcedure,
	TRPCError,
	TRPCInfiniteQueryKey,
} from "~app/trpc";
import type { Pagination } from "~components/pagination";

type CursorPagingResult<T> = {
	pagination: React.ComponentProps<typeof Pagination>;
	query: QueryObserverResult<T, TRPCError>;
	totalCount?: number;
};

export const useCursorPaging = <
	K extends TRPCInfiniteQueryKey,
	P extends TRPCDecoratedInfiniteQueryProcedure<K>,
	I extends Exclude<Parameters<P["queryOptions"]>[0], SkipToken>,
>(
	procedure: P,
	input: Omit<I, "cursor">,
	offsetState: SearchParamState<"/receipts", "offset">,
): CursorPagingResult<P["~types"]["output"]> => {
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
		query,
		pagination,
		totalCount: query.data?.count,
	};
};
