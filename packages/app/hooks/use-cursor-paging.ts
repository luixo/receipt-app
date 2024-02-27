import React from "react";

import type { Pagination } from "@nextui-org/react";
import type { QueryObserverResult } from "@tanstack/react-query";

import { useQueryParam } from "~app/hooks/use-query-param";
import type { TRPCError } from "~app/trpc";

type CursorPagingResult<T extends { count: number }> = {
	pagination: React.ComponentProps<typeof Pagination>;
	query: QueryObserverResult<T, TRPCError>;
	totalCount?: number;
};

export const useCursorPaging = <
	T extends { count: number; hasMore: boolean; cursor: number },
	Input extends { limit: number },
>(
	useQuery: (input: Input, offset: number) => QueryObserverResult<T, TRPCError>,
	input: Input,
	offsetParamName: string,
): CursorPagingResult<T> => {
	const { limit } = input;
	const [offset, setOffset] = useQueryParam<number>(offsetParamName, {
		parse: (rawOffset) => {
			const numberQueryOffset = Number(rawOffset);
			return Number.isNaN(numberQueryOffset) ? 0 : numberQueryOffset;
		},
		serialize: (currentOffset) =>
			currentOffset ? currentOffset.toString() : null,
	});
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
			setOffset(maxOffset);
		}
	}, [setOffset, maxOffset, offset]);

	const onChange = React.useCallback(
		(page: number) => {
			setOffset((page - 1) * limit);
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
