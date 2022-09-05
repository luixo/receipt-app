import zustand from "zustand";

import { TRPCInfiniteQueryCursor } from "app/trpc";
import { Setters } from "app/utils/types";

import { UsersResult, Input } from "./types";

export const getNextPage = (
	result: UsersResult
): TRPCInfiniteQueryCursor<"users.getPaged"> =>
	result.hasMore ? result.items[result.items.length - 1]?.name : undefined;

const inputStore = zustand<Input & Setters<Input>>((set) => ({
	limit: 10,
	changeLimit: (nextLimit: Input["limit"]) => set(() => ({ limit: nextLimit })),
}));

export const useStore = () =>
	[
		inputStore(({ limit }) => ({ limit })),
		inputStore(({ changeLimit }) => ({ changeLimit })),
	] as const;
