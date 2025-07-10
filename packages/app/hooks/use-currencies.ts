import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~app/utils/trpc";
import { serializeDuration } from "~utils/date";

export const useCurrencies = () => {
	const trpc = useTRPC();
	return useQuery(
		trpc.currency.getList.queryOptions(undefined, {
			staleTime: serializeDuration({ months: 1 }),
		}),
	);
};
