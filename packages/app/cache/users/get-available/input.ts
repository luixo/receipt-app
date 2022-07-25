import zustand from "zustand";

import { TRPCInfiniteQueryCursor, TRPCInfiniteQueryInput } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import { AvailableUsersResult } from "./types";

type Input = TRPCInfiniteQueryInput<"users.get-available">;

export const getNextPage = (
	result: AvailableUsersResult
): TRPCInfiniteQueryCursor<"users.get-available"> =>
	result.hasMore ? result.items[result.items.length - 1]?.id : undefined;

const inputStore = zustand<Omit<Input, "receiptId">>((set) => ({
	limit: 10,
	changeLimit: (nextLimit: Input["limit"]) => set(() => ({ limit: nextLimit })),
}));

const mergeState = (
	state: Omit<Input, "receiptId">,
	receiptId: ReceiptsId
): Input => ({ ...state, receiptId });

export const getState = (receiptId: ReceiptsId) => {
	const { limit } = inputStore.getState();
	return mergeState({ limit }, receiptId);
};

export const useStore = (receiptId: ReceiptsId) =>
	mergeState(
		inputStore(({ limit }) => ({ limit })),
		receiptId
	);
