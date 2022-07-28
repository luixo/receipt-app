import zustand from "zustand";

import { TRPCInfiniteQueryCursor } from "app/trpc";

import { UsersResult, Input } from "./types";

export const getNextPage = (
	result: UsersResult
): TRPCInfiniteQueryCursor<"users.get-not-connected"> =>
	result.hasMore ? result.items[result.items.length - 1]?.name : undefined;

const inputStore = zustand<Input>((set) => ({
	limit: 10,
	changeLimit: (nextLimit: Input["limit"]) => set(() => ({ limit: nextLimit })),
}));

export const useStore = () => inputStore(({ limit }) => ({ limit }));
