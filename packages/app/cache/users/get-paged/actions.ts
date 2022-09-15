import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";
import { UsersId } from "next-app/src/db/models";

import { createController } from "./controller";
import { User, Input } from "./types";
import { updatePagedUsers } from "./utils";

const sortByName = (a: User, b: User) => a.name.localeCompare(b.name);

export const update = (
	trpc: TRPCReactContext,
	userId: UsersId,
	updater: (user: User) => User
) => {
	const modifiedUserRef = createRef<User | undefined>();
	updatePagedUsers(trpc, (page, count) => {
		const matchedUserIndex = page.findIndex((user) => user.id === userId);
		if (matchedUserIndex === -1) {
			return [page, count];
		}
		modifiedUserRef.current = page[matchedUserIndex]!;
		return [
			[
				...page.slice(0, matchedUserIndex),
				updater(modifiedUserRef.current),
				...page.slice(matchedUserIndex + 1),
			],
			count,
		];
	});
	return modifiedUserRef.current;
};

export const add = (trpc: TRPCReactContext, nextUser: User) => {
	const shiftedAtCursorRef = createRef<number | undefined>();
	updatePagedUsers(trpc, (page, count, input) => {
		if (shiftedAtCursorRef.current !== undefined) {
			return [page, count + 1];
		}
		const sortedPage = [...page, nextUser].sort(sortByName);
		const sortedIndex = sortedPage.indexOf(nextUser);
		if (sortedIndex === 0) {
			if (input.cursor === 0) {
				shiftedAtCursorRef.current = input.cursor;
				return [sortedPage, count + 1];
			}
			// The beginning of the page - probably should fit on the previous page
			return [page, count];
		}
		if (sortedIndex === sortedPage.length - 1) {
			// The end of the page - probably should fit on the next page
			return [page, count];
		}
		shiftedAtCursorRef.current = input.cursor;
		return [sortedPage.slice(0, input.limit), count + 1];
	});
	return shiftedAtCursorRef.current;
};

export const remove = (trpc: TRPCReactContext, userId: UsersId) => {
	const removedUserRef = createRef<
		{ data: User; cursor?: number } | undefined
	>();
	updatePagedUsers(trpc, (page, count, input) => {
		if (removedUserRef.current) {
			return [page, count - 1];
		}
		const matchedUserIndex = page.findIndex((user) => user.id === userId);
		if (matchedUserIndex === -1) {
			return [page, count];
		}
		removedUserRef.current = {
			data: page[matchedUserIndex]!,
			cursor: input.cursor,
		};
		return [
			[
				...page.slice(0, matchedUserIndex),
				...page.slice(matchedUserIndex + 1),
			].filter(nonNullishGuard),
			count - 1,
		];
	});
	return removedUserRef.current;
};

export const invalidate = (trpc: TRPCReactContext, sinceCursor: number = 0) =>
	createController(trpc).invalidate({
		refetchType: "all",
		predicate: (query) => {
			const input = query.queryKey[1] as Input;
			return input.cursor >= sinceCursor;
		},
	});
