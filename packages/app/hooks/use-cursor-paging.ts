import React from "react";

import type { SkipToken } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import type { SearchParamState } from "~app/hooks/use-navigation";
import type {
	TRPCDecoratedInfiniteQueryProcedure,
	TRPCInfiniteQueryKey,
} from "~app/trpc";
import { updateSetStateAction } from "~utils/react";

export const useCursorPaging = <
	K extends TRPCInfiniteQueryKey,
	P extends
		TRPCDecoratedInfiniteQueryProcedure<K> = TRPCDecoratedInfiniteQueryProcedure<K>,
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

	React.useEffect(() => {
		const maxOffset =
			data.count === 0 ? 0 : (Math.ceil(data.count / limit) - 1) * limit;
		if (offset > maxOffset) {
			setOffset(maxOffset, { replace: true });
		}
	}, [setOffset, data.count, limit, offset]);

	return {
		data: data as P["~types"]["output"],
		onPageChange: React.useCallback<
			React.Dispatch<React.SetStateAction<number>>
		>(
			(setStateAction: React.SetStateAction<number>) =>
				setOffset((prevOffset) => {
					const prevPage = Math.floor(prevOffset / limit) + 1;
					const nextPage = updateSetStateAction(setStateAction, prevPage);
					return (nextPage - 1) * limit;
				}),
			[setOffset, limit],
		),
		isPending: deferredOffset !== offset,
	};
};
