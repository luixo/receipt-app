import React from "react";

import { QueryObserverResult } from "@tanstack/react-query";
import { useQueryState } from "next-usequerystate";
import { createParam } from "solito";

import { Props as PaginationProps } from "app/components/pagination";
import { TRPCError } from "app/trpc";

type CursorPagingResult<T extends { count: number }> = {
	pagination: PaginationProps;
	isLoading: boolean;
	query: QueryObserverResult<T, TRPCError>;
	totalCount?: number;
};

const { useParam } = createParam<{ [K in string]: string }>();

export const useCursorPaging = <
	T extends { count: number; hasMore: boolean; cursor: number },
	Input extends { limit: number }
>(
	useQuery: (input: Input, offset: number) => QueryObserverResult<T, TRPCError>,
	input: Input,
	offsetParamName: string
): CursorPagingResult<T> => {
	const [serverSideQueryOffset] = useParam(offsetParamName);
	const { limit } = input;
	const [queryOffset, setQueryOffset] = useQueryState(offsetParamName, {
		defaultValue: serverSideQueryOffset || "0",
	});
	const numberQueryOffset = Number(queryOffset);
	const initialOffset = Number.isNaN(numberQueryOffset) ? 0 : numberQueryOffset;

	const [offset, setOffset] = React.useState(initialOffset);
	const query = useQuery(input, offset);
	const maxOffset = query.data
		? Math.ceil(query.data.count / limit) * limit
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
		setQueryOffset(offset ? offset.toString() : null);
	}, [offset, setQueryOffset]);
	React.useEffect(() => {
		if (!maxOffset) {
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
		[offset, isFetchingPage, query.data, onPrevPage]
	);
	const prevAllButton = React.useMemo(
		() => ({
			disabled: offset === 0,
			loading: isFetchingPage && offset === 0,
			onClick: onPrevAllPage,
		}),
		[offset, isFetchingPage, onPrevAllPage]
	);
	const nextButton = React.useMemo(
		() => ({
			disabled: maxOffset ? offset === maxOffset : true,
			loading: isFetchingPage && query.data!.cursor <= offset,
			onClick: onNextPage,
		}),
		[offset, maxOffset, isFetchingPage, query.data, onNextPage]
	);
	const nextAllButton = React.useMemo(
		() => ({
			disabled: maxOffset ? offset === maxOffset : true,
			loading: isFetchingPage && offset === maxOffset,
			onClick: onNextAllPage,
		}),
		[offset, maxOffset, isFetchingPage, onNextAllPage]
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
		]
	);
	return {
		query,
		isLoading: query.fetchStatus === "fetching",
		pagination,
		totalCount: query.data?.count,
	};
};
