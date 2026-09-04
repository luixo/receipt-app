import React from "react";

import { count, useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";

import type { TRPCQueryInput, Utils } from "~app/trpc";
import type { SearchParamState } from "~app/utils/navigation";
import { getReceiptsListCollection } from "~mutations/cache/receipts/collections";
import { updateSetStateAction } from "~utils/react";

const validateOffset = ({
	limit,
	offset,
	count: total,
}: {
	limit: number;
	offset: number;
	count: number;
}) => {
	const maxOffset = total === 0 ? 0 : (Math.ceil(total / limit) - 1) * limit;
	if (offset > maxOffset) {
		return maxOffset;
	}
	if (offset % limit !== 0) {
		return Math.floor(offset / limit) * limit;
	}
	return offset;
};

// `limit` here is the UI page size, forced required regardless of
// `receipts.getPaged` now structurally accepting an omitted limit (meaning
// "unlimited", used by the collection's own eager-fetch, not by this hook).
type Input = Omit<
	Pick<TRPCQueryInput<"receipts.getPaged">, "limit" | "orderBy" | "filters">,
	"limit"
> & { limit: number };

// Client-side pagination over an eagerly-loaded (per filter set) TanStack DB
// collection -- mirrors `~app/hooks/use-cursor-paging`'s API shape (data,
// onPageChange, isPending) so callers barely change, but page changes never
// hit the network: the whole matching set is already local.
export const useReceiptsListPage = (
	trpc: Utils,
	input: Input,
	offsetState: SearchParamState<"/_protected/receipts/", "offset">,
) => {
	const { limit, orderBy, filters } = input;
	const queryClient = useQueryClient();
	const [offset, setOffset] = offsetState;
	const deferredOffset = React.useDeferredValue(offset);
	const listCollection = getReceiptsListCollection(queryClient, trpc, {
		orderBy,
		filters,
	});
	const { data: countRows } = useLiveQuery({
		query: (q) =>
			q
				.from({ receipt: listCollection })
				.select(({ receipt }) => ({ total: count(receipt.id) })),
	});
	const receiptsCount = countRows[0]?.total ?? 0;
	const { data: items, isLoading } = useLiveQuery({
		query: (q) =>
			q
				.from({ receipt: listCollection })
				.orderBy(({ receipt }) => receipt.rank, "asc")
				.limit(limit)
				.offset(deferredOffset),
	});
	React.useEffect(() => {
		const validatedOffset = validateOffset({
			offset,
			limit,
			count: receiptsCount,
		});
		if (validatedOffset !== offset) {
			setOffset(validatedOffset);
		}
	}, [receiptsCount, limit, offset, setOffset]);
	return {
		data: { items, count: receiptsCount },
		onPageChange: React.useCallback<
			React.Dispatch<React.SetStateAction<number>>
		>(
			(setStateAction) =>
				setOffset((prevOffset) => {
					const prevPage = Math.floor(prevOffset / limit) + 1;
					const nextPage = updateSetStateAction(setStateAction, prevPage);
					const nextOffset = (nextPage - 1) * limit;
					return validateOffset({
						offset: nextOffset,
						limit,
						count: receiptsCount,
					});
				}),
			[setOffset, limit, receiptsCount],
		),
		isPending: isLoading || deferredOffset !== offset,
	};
};
