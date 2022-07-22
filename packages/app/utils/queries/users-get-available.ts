import { InfiniteData } from "react-query";

import {
	TRPCInfiniteQueryCursor,
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";

type AvailableUsersResult = TRPCQueryOutput<"users.get-available">;
type AvailableUser = AvailableUsersResult["items"][number];
export type GetAvailableUsersInput =
	TRPCInfiniteQueryInput<"users.get-available">;

export const availableUsersGetPagedNextPage = (
	result: AvailableUsersResult
): TRPCInfiniteQueryCursor<"users.get-available"> =>
	result.hasMore ? result.items[result.items.length - 1]?.id : undefined;

export const DEFAULT_PARTIAL_INPUT: Omit<GetAvailableUsersInput, "receiptId"> =
	{
		limit: 10,
	};

const sortById = (a: AvailableUser, b: AvailableUser) =>
	a.id.localeCompare(b.id);

const getAvailableUsersGetPagedData = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput
) => trpc.getInfiniteQueryData(["users.get-available", input]);
const setAvailableUsersGetPagedData = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	data: InfiniteData<AvailableUsersResult>
) => trpc.setInfiniteQueryData(["users.get-available", input], data);

const updateAvailableUsers = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	updater: (
		page: AvailableUser[],
		pageIndex: number,
		pages: AvailableUser[][]
	) => AvailableUser[]
) => {
	const prevData = getAvailableUsersGetPagedData(trpc, input);
	if (!prevData) {
		return;
	}
	const nextPages = prevData.pages.map((result, index, results) => {
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
	if (nextPages === prevData.pages) {
		return;
	}
	setAvailableUsersGetPagedData(trpc, input, { ...prevData, pages: nextPages });
};

export const addAvailableUser = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	nextUser: AvailableUser
) => {
	let shouldShift = false;
	updateAvailableUsers(trpc, input, (page, pageIndex, pages) => {
		if (shouldShift) {
			return [pages[pageIndex - 1]!.at(-1)!, ...page.slice(0, input.limit)];
		}
		const sortedPage = [...page, nextUser].sort(sortById);
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

export const removeAvailableUser = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	shouldRemove: (user: AvailableUser) => boolean
) => {
	let removedUser: AvailableUser | undefined;
	updateAvailableUsers(trpc, input, (page, pageIndex, pages) => {
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
