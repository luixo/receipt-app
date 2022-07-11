import { UsersId } from "next-app/src/db/models";

import {
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "../../trpc";

type AvailableUser = TRPCQueryOutput<"users.get-available">[number];
export type GetAvailableUsersInput =
	TRPCInfiniteQueryInput<"users.get-available">;

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
		userIndex = page.findIndex((user) => user.id === userId);
		return userIndex !== -1;
	});
	const user = prevData.pages[pageIndex]?.[userIndex];
	if (!user) {
		return;
	}
	return {
		pageIndex,
		userIndex,
		user,
	};
};

export const updateAvailableUsers = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	updater: (
		page: AvailableUser[],
		pageIndex: number,
		pages: AvailableUser[][]
	) => AvailableUser[]
) => {
	const prevData = trpc.getInfiniteQueryData(["users.get-available", input]);
	if (!prevData) {
		return;
	}
	const nextPages = prevData.pages.map(updater);
	if (nextPages === prevData.pages) {
		return;
	}
	trpc.setInfiniteQueryData(["users.get-available", input], {
		...prevData,
		pages: nextPages,
	});
};
