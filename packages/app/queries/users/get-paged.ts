import { cache } from "app/cache";
import { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";
import { TRPCQueryInput } from "app/trpc";
import { createStore } from "app/utils/store";
import { Setters } from "app/utils/types";

type Input = TRPCQueryInput<"users.getPaged">;

type CursorlessOmit = Omit<Input, "cursor">;

export const inputStore = createStore<CursorlessOmit & Setters<CursorlessOmit>>(
	(set) => ({
		limit: 10,
		changeLimit: (nextLimit) => set(() => ({ limit: nextLimit })),
	})
);

export const useStore = () =>
	[
		inputStore.useStore(({ limit }) => ({ limit })),
		inputStore.useStore(({ changeLimit }) => ({ changeLimit })),
	] as const;

export const options: UseContextedQueryOptions<"users.getPaged"> = {
	onSuccess: (trpcContext) => (data) => {
		data.items.forEach((user) => {
			cache.users.getName.add(trpcContext, user.id, user.name);
		});
	},
};
