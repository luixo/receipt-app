import {
	TRPCInfiniteQueryCursor,
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import { UsersId } from "next-app/src/db/models";

import { InfiniteDataController, updatePagedResult } from "./utils";

type UsersResult = TRPCQueryOutput<"users.get-paged">;
type User = UsersResult["items"][number];
export type UsersGetPagedInput = TRPCInfiniteQueryInput<"users.get-paged">;

export const usersGetPagedNextPage = (
	result: UsersResult
): TRPCInfiniteQueryCursor<"users.get-paged"> =>
	result.hasMore ? result.items[result.items.length - 1]?.name : undefined;

export const DEFAULT_INPUT: UsersGetPagedInput = {
	limit: 10,
};

export const getPagedUserById = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	userId: UsersId
) => {
	const prevData = trpc.getInfiniteQueryData(["users.get-paged", input]);
	if (!prevData) {
		return;
	}
	let userIndex = -1;
	const pageIndex = prevData.pages.findIndex((page) => {
		userIndex = page.items.findIndex((user) => user.id === userId);
		return userIndex !== -1;
	});
	const user = prevData.pages[pageIndex]?.items[userIndex];
	if (!user) {
		return;
	}
	return {
		pageIndex,
		userIndex,
		user,
	};
};

const getUsersGetPagedController = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput
): InfiniteDataController<UsersResult> => ({
	getData: () => trpc.getInfiniteQueryData(["users.get-paged", input]),
	setData: (data) =>
		trpc.setInfiniteQueryData(["users.get-paged", input], data),
});

export const updatePagedUsersResult = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	updater: (
		result: UsersResult,
		resultIndex: number,
		results: UsersResult[]
	) => UsersResult
) => updatePagedResult(getUsersGetPagedController(trpc, input), updater);

export const updatePagedUsers = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	updater: (page: User[], pageIndex: number, pages: User[][]) => User[]
) => {
	updatePagedUsersResult(trpc, input, (result, index, results) => {
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
};
