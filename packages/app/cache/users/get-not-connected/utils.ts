import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { User, UsersResult } from "./types";

const updatePagedUsersPages = (
	trpc: TRPCReactContext,
	updater: (
		result: UsersResult,
		resultIndex: number,
		results: UsersResult[]
	) => UsersResult
) =>
	createController(trpc).update((prevData) => {
		const nextPages = prevData.pages.map(updater);
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});

export const updatePagedUsers = (
	trpc: TRPCReactContext,
	updater: (page: User[], pageIndex: number, pages: User[][]) => User[]
) =>
	updatePagedUsersPages(trpc, (result, index, results) => {
		const nextItems = updater(
			result.items,
			index,
			results.map(({ items }) => items)
		);
		if (nextItems === result.items) {
			return result;
		}
		return {
			...result,
			items: nextItems,
		};
	});
