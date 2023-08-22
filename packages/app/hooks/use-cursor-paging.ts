import React from "react";

import type { QueryObserverResult } from "@tanstack/react-query";

import type { Props as PaginationProps } from "app/components/pagination";
import { useQueryParam } from "app/hooks/use-query-param";
import type { TRPCError } from "app/trpc";

type CursorPagingResult<T extends { count: number }> = {
	pagination: PaginationProps;
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
	const onNextPage = React.useCallback(() => {
		setOffset((prevOffset) => prevOffset + limit);
	}, [setOffset, limit]);
	const onNextAllPage = React.useCallback(() => {
		if (!maxOffset) {
			return;
		}
		setOffset(maxOffset);
	}, [setOffset, maxOffset]);
	const onPrevPage = React.useCallback(() => {
		setOffset((prevOffset) => prevOffset - limit);
	}, [setOffset, limit]);
	const onPrevAllPage = React.useCallback(() => {
		setOffset(0);
	}, [setOffset]);

	React.useEffect(() => {
		if (maxOffset === undefined) {
			return;
		}
		if (offset > maxOffset) {
			setOffset(maxOffset);
		}
	}, [setOffset, maxOffset, offset]);

	const isFetchingPage = Boolean(query.isPreviousData && query.data);
	const prevButton = React.useMemo(
		() => ({
			disabled: offset === 0,
			loading: isFetchingPage && query.data!.cursor > offset,
			onClick: onPrevPage,
		}),
		[offset, isFetchingPage, query.data, onPrevPage],
	);
	const prevAllButton = React.useMemo(
		() => ({
			disabled: offset === 0,
			loading: isFetchingPage && offset === 0,
			onClick: onPrevAllPage,
		}),
		[offset, isFetchingPage, onPrevAllPage],
	);
	const nextButton = React.useMemo(
		() => ({
			disabled: maxOffset ? offset === maxOffset : true,
			loading: isFetchingPage && query.data!.cursor <= offset,
			onClick: onNextPage,
		}),
		[offset, maxOffset, isFetchingPage, query.data, onNextPage],
	);
	const nextAllButton = React.useMemo(
		() => ({
			disabled: maxOffset ? offset === maxOffset : true,
			loading: isFetchingPage && offset === maxOffset,
			onClick: onNextAllPage,
		}),
		[offset, maxOffset, isFetchingPage, onNextAllPage],
	);
	const pagination = React.useMemo(
		() => ({
			prev: prevButton,
			prevAll: prevAllButton,
			next: nextButton,
			nextAll: nextAllButton,
			selectedPage: query.data?.count === 0 ? 0 : offset / limit + 1,
			totalPages:
				query.data === undefined
					? undefined
					: Math.ceil(query.data.count / limit),
		}),
		[
			prevButton,
			prevAllButton,
			nextButton,
			nextAllButton,
			query.data,
			offset,
			limit,
		],
	);
	return {
		query,
		pagination,
		totalCount: query.data?.count,
	};
};
