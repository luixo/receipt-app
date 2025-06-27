import React from "react";

import type { QueryObserverResult } from "@tanstack/react-query";

import type { SearchParamState } from "~app/hooks/use-navigation";
import type { TRPCError } from "~app/trpc";
import type { Pagination } from "~components/pagination";

type CursorPagingResult<T extends { count: number }> = {
	pagination: React.ComponentProps<typeof Pagination>;
	query: QueryObserverResult<T, TRPCError>;
	totalCount?: number;
};

export const useCursorPaging = <
	T extends { count: number; cursor: number },
	Input extends { limit: number },
>(
	useQuery: (input: Input, offset: number) => QueryObserverResult<T, TRPCError>,
	input: Input,
	offsetState: SearchParamState<"/receipts", "offset">,
): CursorPagingResult<T> => {
	const { limit } = input;
	const [offset, setOffset] = offsetState;
	const query = useQuery(input, offset);
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
			showControls: true,
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
