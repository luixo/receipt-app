import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { User, UsersResult, Input } from "./types";

const updatePagedUsersPages = (
	trpc: TRPCReactContext,
	updater: (
		result: UsersResult,
		resultIndex: number,
		results: UsersResult[],
		input: Input
	) => UsersResult
) =>
	createController(trpc).update(([input, prevData]) => {
		const nextPages = prevData.pages.map((result, index, results) =>
			updater(result, index, results, input)
		);
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});

export const updatePagedUsers = (
	trpc: TRPCReactContext,
	updater: (
		page: User[],
		pageIndex: number,
		pages: User[][],
		input: Input
	) => User[]
) =>
	updatePagedUsersPages(trpc, (result, index, results, input) => {
		const nextItems = updater(
			result.items,
			index,
			results.map(({ items }) => items),
			input
		);
		if (nextItems === result.items) {
			return result;
		}
		return {
			...result,
			items: nextItems,
		};
	});
