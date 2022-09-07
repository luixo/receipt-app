import zustand from "zustand";

import { Setters } from "app/utils/types";

import { Input } from "./types";

type CursorlessOmit = Omit<Input, "cursor">;

const inputStore = zustand<CursorlessOmit & Setters<CursorlessOmit>>((set) => ({
	limit: 10,
	changeLimit: (nextLimit: Input["limit"]) => set(() => ({ limit: nextLimit })),
}));

export const useStore = () =>
	[
		inputStore(({ limit }) => ({ limit })),
		inputStore(({ changeLimit }) => ({ changeLimit })),
	] as const;
