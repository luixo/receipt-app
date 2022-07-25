import zustand from "zustand";

import { TRPCInfiniteQueryCursor, TRPCInfiniteQueryInput } from "app/trpc";

import { UsersResult } from "./types";

type Input = TRPCInfiniteQueryInput<"users.get-paged">;

export const getNextPage = (
	result: UsersResult
): TRPCInfiniteQueryCursor<"users.get-paged"> =>
	result.hasMore ? result.items[result.items.length - 1]?.name : undefined;

const inputStore = zustand<Input>((set) => ({
	limit: 10,
	changeLimit: (nextLimit: Input["limit"]) => set(() => ({ limit: nextLimit })),
}));

export const getState = () => {
	const { limit } = inputStore.getState();
	return { limit };
};

export const useStore = () => inputStore(({ limit }) => ({ limit }));
