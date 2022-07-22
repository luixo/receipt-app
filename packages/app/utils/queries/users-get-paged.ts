import { InfiniteData } from "react-query";
import zustand from "zustand";

import {
	TRPCInfiniteQueryCursor,
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";
import { UsersId } from "next-app/src/db/models";

type UsersResult = TRPCQueryOutput<"users.get-paged">;
type User = UsersResult["items"][number];
export type UsersGetPagedInput = TRPCInfiniteQueryInput<"users.get-paged">;

export const usersGetPagedNextPage = (
	result: UsersResult
): TRPCInfiniteQueryCursor<"users.get-paged"> =>
	result.hasMore ? result.items[result.items.length - 1]?.name : undefined;

export const usersGetPagedInputStore = zustand<UsersGetPagedInput>((set) => ({
	limit: 10,
	changeLimit: (nextLimit: UsersGetPagedInput["limit"]) =>
		set(() => ({ limit: nextLimit })),
}));

const sortByName = (a: User, b: User) => a.name.localeCompare(b.name);

const getUsersGetPagedData = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput
) => trpc.getInfiniteQueryData(["users.get-paged", input]);
const setUsersGetPagedData = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	data: InfiniteData<UsersResult>
) => trpc.setInfiniteQueryData(["users.get-paged", input], data);

const updatePagedUsersResult = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	updater: (prevData: InfiniteData<UsersResult>) => InfiniteData<UsersResult>
) => {
	const prevData = getUsersGetPagedData(trpc, input);
	if (!prevData) {
		return;
	}
	setUsersGetPagedData(trpc, input, updater(prevData));
};

const updatePagedUsersPages = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	updater: (
		result: UsersResult,
		resultIndex: number,
		results: UsersResult[]
	) => UsersResult
) => {
	updatePagedUsersResult(trpc, input, (prevData) => {
		const nextPages = prevData.pages.map(updater);
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});
};

const updatePagedUsers = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	updater: (page: User[], pageIndex: number, pages: User[][]) => User[]
) => {
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
};

export const updatePagedUser = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	userId: UsersId,
	updater: (user: User) => User
) => {
	let modifiedUser: User | undefined;
	updatePagedUsers(trpc, input, (page) => {
		const matchedUserIndex = page.findIndex((user) => user.id === userId);
		if (matchedUserIndex === -1) {
			return page;
		}
		modifiedUser = page[matchedUserIndex]!;
		return [
			...page.slice(0, matchedUserIndex),
			updater(modifiedUser),
			...page.slice(matchedUserIndex + 1),
		];
	});
	return modifiedUser;
};

export const addPagedUser = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	nextUser: User
) => {
	let shouldShift = false;
	updatePagedUsers(trpc, input, (page, pageIndex, pages) => {
		if (shouldShift) {
			return [pages[pageIndex - 1]!.at(-1)!, ...page.slice(0, input.limit)];
		}
		const sortedPage = [...page, nextUser].sort(sortByName);
		if (sortedPage.indexOf(nextUser) === page.length - 1) {
			if (page.length !== input.limit) {
				shouldShift = true;
				return sortedPage;
			}
			return page;
		}
		shouldShift = true;
		return sortedPage.slice(0, input.limit);
	});
};

export const removePagedUser = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	shouldRemove: (user: User) => boolean
) => {
	let removedUser: User | undefined;
	updatePagedUsers(trpc, input, (page, pageIndex, pages) => {
		if (removedUser) {
			return [...page.slice(1), pages[pageIndex - 1]![0]].filter(
				nonNullishGuard
			);
		}
		const matchedUserIndex = page.findIndex(shouldRemove);
		if (matchedUserIndex === -1) {
			return page;
		}
		removedUser = page[matchedUserIndex]!;
		return [
			...page.slice(0, matchedUserIndex),
			...page.slice(matchedUserIndex + 1),
			pages[pageIndex - 1]![0],
		].filter(nonNullishGuard);
	});
	return removedUser;
};
