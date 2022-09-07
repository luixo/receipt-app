import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { User, Input } from "./types";

export const updatePagedUsers = (
	trpc: TRPCReactContext,
	updater: (page: User[], count: number, input: Input) => [User[], number]
) =>
	createController(trpc).update(([input, result]) => {
		const [nextItems, nextCount] = updater(result.items, result.count, input);
		if (nextItems === result.items && nextCount === result.count) {
			return result;
		}
		return { ...result, items: nextItems, count: nextCount };
	});
