import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { User, Input } from "./types";

export const updatePagedUsers = (
	trpc: TRPCReactContext,
	updater: (page: User[], input: Input) => User[]
) =>
	createController(trpc).update(([input, result]) => {
		const nextItems = updater(result.items, input);
		if (nextItems === result.items) {
			return result;
		}
		return { ...result, items: nextItems };
	});
