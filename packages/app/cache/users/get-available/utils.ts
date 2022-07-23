import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { AvailableUser, GetAvailableUsersInput } from "./types";

export const updateAvailableUsers = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput,
	updater: (
		page: AvailableUser[],
		pageIndex: number,
		pages: AvailableUser[][]
	) => AvailableUser[]
) =>
	createController(trpc, input).update((prevData) => {
		const nextPages = prevData.pages.map((result, index, results) => {
			const nextItems = updater(
				result.items,
				index,
				results.map(({ items }) => items)
			);
			if (nextItems === result.items) {
				return result;
			}
			return { ...result, items: nextItems };
		});
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});
