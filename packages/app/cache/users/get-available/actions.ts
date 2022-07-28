import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";
import { ReceiptsId, UsersId } from "next-app/db/models";

import { AvailableUser } from "./types";
import { updateAvailableUsers } from "./utils";

export * from "./input";

const sortById = (a: AvailableUser, b: AvailableUser) =>
	a.id.localeCompare(b.id);

export const add = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	nextUser: AvailableUser
) => {
	const shouldShiftRef = createRef(false);
	updateAvailableUsers(trpc, receiptId, (page, pageIndex, pages, input) => {
		if (shouldShiftRef.current) {
			return [pages[pageIndex - 1]!.at(-1)!, ...page.slice(0, input.limit)];
		}
		const sortedPage = [...page, nextUser].sort(sortById);
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
	receiptId: ReceiptsId,
	userId: UsersId
) => {
	const removedUserRef = createRef<AvailableUser | undefined>();
	updateAvailableUsers(trpc, receiptId, (page, pageIndex, pages) => {
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
