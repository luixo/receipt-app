import React from "react";

import { QueryObserverResult } from "@tanstack/react-query";
import { useQueryState } from "next-usequerystate";
import { createParam } from "solito";

import { TRPCError } from "app/trpc";

export type CursorPagingResult<T extends { count: number }> = {
	onNextPage: () => void;
	onPrevPage: () => void;
	selectedPageIndex: number;
	query: QueryObserverResult<T, TRPCError>;
	isLoading: boolean;
	prevDisabled: boolean;
	prevLoading: boolean;
	nextDisabled: boolean;
	nextLoading: boolean;
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
	const onNextPage = React.useCallback(() => {
		setOffset((prevOffset) => prevOffset + limit);
	}, [setOffset, limit]);
	const onPrevPage = React.useCallback(() => {
		setOffset((prevOffset) => prevOffset - limit);
	}, [setOffset, limit]);

	React.useEffect(() => {
		setQueryOffset(offset ? offset.toString() : null);
	}, [offset, setQueryOffset]);

	const isFetchingPage = Boolean(query.isPreviousData && query.data);
	return {
		onNextPage,
		onPrevPage,
		selectedPageIndex: query.data?.count === 0 ? -1 : offset / limit,
		query,
		isLoading: query.fetchStatus === "fetching",
		prevDisabled: offset === 0,
		prevLoading: isFetchingPage && query.data!.cursor > offset,
		nextDisabled: query.data ? offset + limit >= query.data.count : true,
		nextLoading: isFetchingPage && query.data!.cursor <= offset,
		totalCount: query.data?.count,
	};
};
