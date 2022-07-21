import React from "react";

import { UseInfiniteQueryResult } from "react-query";

export const useCursorPaging = <T extends { count: number }>(
	query: UseInfiniteQueryResult<T>
) => {
	const [selectedPageIndex, setSelectedPageIndex] = React.useState(0);
	const [prevSelectedPageIndex, setPrevSelectedPageIndex] = React.useState(-1);
	const isNextPageFetched = query.data
		? query.data.pages.length > selectedPageIndex + 1
		: true;
	const saveSelectedPageIndex = React.useCallback(() => {
		setPrevSelectedPageIndex(selectedPageIndex);
	}, [setPrevSelectedPageIndex, selectedPageIndex]);
	const onNextPage = React.useCallback(() => {
		if (!query.data) {
			return;
		}
		saveSelectedPageIndex();
		setSelectedPageIndex((index) => index + 1);
		if (!isNextPageFetched) {
			query.fetchNextPage();
		}
	}, [saveSelectedPageIndex, query, setSelectedPageIndex, isNextPageFetched]);
	const onPrevPage = React.useCallback(() => {
		saveSelectedPageIndex();
		setSelectedPageIndex((index) => index - 1);
	}, [saveSelectedPageIndex, setSelectedPageIndex]);
	const selectedPage = query.data?.pages[selectedPageIndex];
	const prevSelectedPage = query.data?.pages[prevSelectedPageIndex];
	return {
		onNextPage,
		onPrevPage,
		selectedPageIndex,
		selectedPage,
		prevSelectedPage,
		isLoading:
			query.isLoading || (!isNextPageFetched && query.isFetchingNextPage),
		prevDisabled: selectedPageIndex === 0,
		prevLoading: false,
		nextDisabled: isNextPageFetched ? false : !query.hasNextPage,
		nextLoading: isNextPageFetched ? false : query.isFetchingNextPage,
		totalCount: query.data?.pages[0]?.count,
	};
};
