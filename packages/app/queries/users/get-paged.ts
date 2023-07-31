import { cache } from "app/cache";
import { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";
import { TRPCQueryInput } from "app/trpc";
import { createStore, updateWithFn } from "app/utils/store";
import { Setters } from "app/utils/types";
import { noop } from "app/utils/utils";

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
				get: noop,
				getPaged: noop,
				getName: (controller) => controller.upsert(user.id, user.name),
			});
		});
	},
};
