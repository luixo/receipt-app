import { createStore } from "app/utils/store";
import { Setters } from "app/utils/types";

import { Input } from "./types";

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
