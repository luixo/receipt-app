import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { User, UsersGetPagedInput, UsersResult } from "./types";

const updatePagedUsersPages = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	updater: (
		result: UsersResult,
		resultIndex: number,
		results: UsersResult[]
	) => UsersResult
) =>
	createController(trpc, input).update((prevData) => {
		const nextPages = prevData.pages.map(updater);
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});

export const updatePagedUsers = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	updater: (page: User[], pageIndex: number, pages: User[][]) => User[]
) =>
	updatePagedUsersPages(trpc, input, (result, index, results) => {
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
