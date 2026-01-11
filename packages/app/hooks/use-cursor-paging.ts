import React from "react";

import type { SkipToken } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import type {
	TRPCDecoratedInfiniteQueryProcedure,
	TRPCInfiniteQueryKey,
} from "~app/trpc";
import type { SearchParamState } from "~app/utils/navigation";
import { updateSetStateAction } from "~utils/react";

const validateOffset = ({
	limit,
	offset,
	count,
}: {
	limit: number;
	offset: number;
	count: number;
}) => {
	const maxOffset = count === 0 ? 0 : (Math.ceil(count / limit) - 1) * limit;
	if (offset > maxOffset) {
		return maxOffset;
	}
	if (offset % limit !== 0) {
		return Math.floor(offset / limit) * limit;
	}
	return offset;
};

export const useCursorPaging = <
	K extends TRPCInfiniteQueryKey,
	P extends TRPCDecoratedInfiniteQueryProcedure<K> =
		TRPCDecoratedInfiniteQueryProcedure<K>,
	I extends Exclude<Parameters<P["queryOptions"]>[0], SkipToken> = Exclude<
		Parameters<P["queryOptions"]>[0],
		SkipToken
	>,
>(
	procedure: P,
	input: Omit<I, "cursor">,
	offsetState: SearchParamState<"/receipts", "offset">,
) => {
	const { limit } = input;
	const [offset, setOffset] = offsetState;
	const deferredOffset = React.useDeferredValue(offset);
	const { data } = useSuspenseQuery(
		// This is hacky, but I couldn't manage types here
		(
			procedure as TRPCDecoratedInfiniteQueryProcedure<"users.getPaged">
		).queryOptions({ ...input, cursor: deferredOffset }),
	);
	const { count } = data;
	React.useEffect(() => {
		// This affect helps with invalid navigations / limit changes
		const validatedOffset = validateOffset({ offset, limit, count });
		if (validatedOffset !== offset) {
			setOffset(validatedOffset);
		}
	}, [count, limit, offset, setOffset]);

	return {
		data: data as P["~types"]["output"],
		onPageChange: React.useCallback<
			React.Dispatch<React.SetStateAction<number>>
		>(
			(setStateAction: React.SetStateAction<number>) =>
				setOffset((prevOffset) => {
					const prevPage = Math.floor(prevOffset / limit) + 1;
					const nextPage = updateSetStateAction(setStateAction, prevPage);
					const nextOffset = (nextPage - 1) * limit;
					return validateOffset({ offset: nextOffset, limit, count });
				}),
			[setOffset, limit, count],
		),
		isPending: deferredOffset !== offset,
	};
};
