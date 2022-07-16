import {
	TRPCInfiniteQueryCursor,
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import { UsersId } from "next-app/src/db/models";

import { InfiniteDataController, updatePagedResult } from "./utils";

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

export const getAvailableUserById = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	userId: UsersId
) => {
	const prevData = trpc.getInfiniteQueryData(["users.get-available", input]);
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
	input: GetAvailableUsersInput
): InfiniteDataController<AvailableUsersResult> => ({
	getData: () => trpc.getInfiniteQueryData(["users.get-available", input]),
	setData: (data) =>
		trpc.setInfiniteQueryData(["users.get-available", input], data),
});

export const updateAvailableUsersResult = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	updater: (
		result: AvailableUsersResult,
		resultIndex: number,
		results: AvailableUsersResult[]
	) => AvailableUsersResult
) => updatePagedResult(getUsersGetPagedController(trpc, input), updater);

export const updateAvailableUsers = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	updater: (
		page: AvailableUser[],
		pageIndex: number,
		pages: AvailableUser[][]
	) => AvailableUser[]
) => {
	updateAvailableUsersResult(trpc, input, (result, index, results) => {
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
