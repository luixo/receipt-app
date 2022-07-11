import { UsersId } from "next-app/src/db/models";

import {
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "../../trpc";

type User = TRPCQueryOutput<"users.get-paged">[number];
export type UsersGetPagedInput = TRPCInfiniteQueryInput<"users.get-paged">;

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

export const updatePagedUsers = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	updater: (page: User[], pageIndex: number, pages: User[][]) => User[]
) => {
	const prevData = trpc.getInfiniteQueryData(["users.get-paged", input]);
	if (!prevData) {
		return;
	}
	const nextPages = prevData.pages.map(updater);
	if (nextPages === prevData.pages) {
		return;
	}
	trpc.setInfiniteQueryData(["users.get-paged", input], {
		...prevData,
		pages: nextPages,
	});
};
