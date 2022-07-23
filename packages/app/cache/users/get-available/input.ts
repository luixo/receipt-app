import { TRPCInfiniteQueryCursor } from "app/trpc";

import { AvailableUsersResult, GetAvailableUsersInput } from "./types";

export const getNextPage = (
	result: AvailableUsersResult
): TRPCInfiniteQueryCursor<"users.get-available"> =>
	result.hasMore ? result.items[result.items.length - 1]?.id : undefined;

export const DEFAULT_PARTIAL_INPUT: Omit<GetAvailableUsersInput, "receiptId"> =
	{
		limit: 10,
	};
