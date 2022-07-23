import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";

import { User, UsersGetPagedInput } from "./types";
import { updatePagedUsers } from "./utils";

export * from "./input";

const sortByName = (a: User, b: User) => a.name.localeCompare(b.name);

export const add = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	nextUser: User
) => {
	const shouldShiftRef = createRef(false);
	updatePagedUsers(trpc, input, (page, pageIndex, pages) => {
		if (shouldShiftRef.current) {
			return [pages[pageIndex - 1]!.at(-1)!, ...page.slice(0, input.limit)];
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

export const remove = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput,
	shouldRemove: (user: User) => boolean
) => {
	const removedUserRef = createRef<User | undefined>();
	updatePagedUsers(trpc, input, (page, pageIndex, pages) => {
		if (removedUserRef.current) {
			return [...page.slice(1), pages[pageIndex + 1]?.[0]].filter(
				nonNullishGuard
			);
		}
		const matchedUserIndex = page.findIndex(shouldRemove);
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
