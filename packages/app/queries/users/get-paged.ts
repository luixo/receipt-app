import { cache } from "app/cache";
import type { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";
import type { TRPCQueryInput } from "app/trpc";
import { createStore, updateWithFn } from "app/utils/store";
import type { Setters } from "app/utils/types";

type Input = TRPCQueryInput<"users.getPaged">;

type CursorlessOmit = Omit<Input, "cursor">;

export const inputStore = createStore<CursorlessOmit & Setters<CursorlessOmit>>(
	(set) => ({
		limit: 10,
		changeLimit: (maybeUpdater) =>
			set((prev) => ({ limit: updateWithFn(prev.limit, maybeUpdater) })),
	}),
);

export const useStore = () =>
	[
		inputStore.useStore(({ limit }) => ({ limit })),
		inputStore.useStore(({ changeLimit }) => ({ changeLimit })),
	] as const;

export const options: UseContextedQueryOptions<"users.getPaged"> = {
	onSuccess: (controllerContext) => (data) => {
		data.items.forEach((user) => {
			cache.users.update(controllerContext, {
				get: undefined,
				getPaged: undefined,
				getName: (controller) => controller.upsert(user.id, user.name),
			});
		});
	},
};
