import type { TRPCQueryInput } from "~app/trpc";
import { updateSetStateAction } from "~utils";

import { createStore } from "../store";
import type { Setters } from "../types";

type Input = TRPCQueryInput<"users.getPaged">;

type CursorlessOmit = Omit<Input, "cursor">;

export const inputStore = createStore<CursorlessOmit & Setters<CursorlessOmit>>(
	(set) => ({
		limit: 10,
		changeLimit: (setStateAction) =>
			set((prev) => ({
				limit: updateSetStateAction(setStateAction, prev.limit),
			})),
	}),
);

export const useStore = () =>
	[
		inputStore.useStore(({ limit }) => ({ limit })),
		inputStore.useStore(({ changeLimit }) => ({ changeLimit })),
	] as const;
