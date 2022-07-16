import { InfiniteData } from "react-query";

export type InfiniteDataController<T> = {
	getData: () => InfiniteData<T> | undefined;
	setData: (data: InfiniteData<T>) => void;
};

export const updatePagedResult = <T>(
	controller: InfiniteDataController<T>,
	updater: (result: T, resultIndex: number, results: T[]) => T
) => {
	const prevData = controller.getData();
	if (!prevData) {
		return;
	}
	const nextPages = prevData.pages.map(updater);
	if (nextPages === prevData.pages) {
		return;
	}
	controller.setData({ ...prevData, pages: nextPages });
};
