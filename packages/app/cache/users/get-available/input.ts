import zustand from "zustand";

import { TRPCInfiniteQueryCursor } from "app/trpc";
import { Setters } from "app/utils/types";
import { ReceiptsId } from "next-app/db/models";

import {
	AvailableUsersResult,
	Input,
	RequiredInput,
	OmittedInput,
} from "./types";

export const getNextPage = (
	result: AvailableUsersResult
): TRPCInfiniteQueryCursor<"users.get-available"> =>
	result.hasMore ? result.items[result.items.length - 1]?.id : undefined;

const inputStore = zustand<OmittedInput & Setters<OmittedInput>>((set) => ({
	limit: 10,
	changeLimit: (nextLimit: Input["limit"]) => set(() => ({ limit: nextLimit })),
}));

const mergeState = (state: OmittedInput, receiptId: ReceiptsId): Input => ({
	...state,
	receiptId,
});

export const getRequiredState = (receiptId: ReceiptsId): RequiredInput => ({
	receiptId,
});

export const useStore = (receiptId: ReceiptsId) =>
	[
		mergeState(
			inputStore(({ limit }) => ({ limit })),
			receiptId
		),
		inputStore(({ changeLimit }) => ({ changeLimit })),
	] as const;
