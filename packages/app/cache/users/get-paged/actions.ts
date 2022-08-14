import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";
import { UsersId } from "next-app/src/db/models";

import { User } from "./types";
import { updatePagedUsers } from "./utils";

export * from "./input";

const sortByName = (a: User, b: User) => a.name.localeCompare(b.name);

export const update = (
	trpc: TRPCReactContext,
	userId: UsersId,
	updater: (user: User) => User
) => {
	const modifiedUserRef = createRef<User | undefined>();
	updatePagedUsers(trpc, (page) => {
		const matchedUserIndex = page.findIndex((user) => user.id === userId);
		if (matchedUserIndex === -1) {
			return page;
		}
		modifiedUserRef.current = page[matchedUserIndex]!;
		return [
			...page.slice(0, matchedUserIndex),
			updater(modifiedUserRef.current),
			...page.slice(matchedUserIndex + 1),
		];
	});
	return modifiedUserRef.current;
};

export const add = (trpc: TRPCReactContext, nextUser: User) => {
	const shouldShiftRef = createRef(false);
	updatePagedUsers(trpc, (page, pageIndex, pages, input) => {
		if (shouldShiftRef.current) {
			const prevPage = pages[pageIndex - 1];
			if (!prevPage) {
				return [];
			}
			return [prevPage.at(-1)!, ...page.slice(0, input.limit)];
		}
		const sortedPage = [...page, nextUser].sort(sortByName);
		if (sortedPage.indexOf(nextUser) === page.length - 1) {
			if (page.length !== input.limit) {
				shouldShiftRef.current = true;
				return sortedPage;
			}
			return page;
		}
		shouldShiftRef.current = true;
		return sortedPage.slice(0, input.limit);
	});
};

export const remove = (trpc: TRPCReactContext, userId: UsersId) => {
	const removedUserRef = createRef<User | undefined>();
	updatePagedUsers(trpc, (page, pageIndex, pages) => {
		if (removedUserRef.current) {
			return [...page.slice(1), pages[pageIndex + 1]?.[0]].filter(
				nonNullishGuard
			);
		}
		const matchedUserIndex = page.findIndex((user) => user.id === userId);
		if (matchedUserIndex === -1) {
			return page;
		}
		removedUserRef.current = page[matchedUserIndex]!;
		return [
			...page.slice(0, matchedUserIndex),
			...page.slice(matchedUserIndex + 1),
			pages[pageIndex + 1]?.[0],
		].filter(nonNullishGuard);
	});
	return removedUserRef.current;
};
