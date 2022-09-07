import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { Receipt, Input } from "./types";

export const updatePagedReceipts = (
	trpc: TRPCReactContext,
	updater: (page: Receipt[], input: Input) => Receipt[]
) =>
	createController(trpc).update(([input, result]) => {
		const nextItems = updater(result.items, input);
		if (nextItems === result.items) {
			return result;
		}
		return { ...result, items: nextItems };
	});
