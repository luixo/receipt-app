import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { Receipt, Input } from "./types";

export const updatePagedReceipts = (
	trpc: TRPCReactContext,
	updater: (page: Receipt[], count: number, input: Input) => [Receipt[], number]
) =>
	createController(trpc).update(([input, result]) => {
		const [nextItems, nextCount] = updater(result.items, result.count, input);
		if (nextItems === result.items && nextCount === result.count) {
			return result;
		}
		return { ...result, items: nextItems, count: nextCount };
	});
