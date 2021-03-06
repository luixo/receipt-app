import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import { createController } from "./controller";
import { AvailableUser, Input } from "./types";

export const updateAvailableUsers = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	updater: (
		page: AvailableUser[],
		pageIndex: number,
		pages: AvailableUser[][],
		input: Input
	) => AvailableUser[]
) =>
	createController(trpc, receiptId).update(([input, prevData]) => {
		const nextPages = prevData.pages.map((result, index, results) => {
			const nextItems = updater(
				result.items,
				index,
				results.map(({ items }) => items),
				input
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
