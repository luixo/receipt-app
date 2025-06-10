import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~app/utils/trpc";
import { MONTH } from "~utils/time";

export const useCurrencies = () => {
	const trpc = useTRPC();
	return useQuery(
		trpc.currency.getList.queryOptions(undefined, { staleTime: MONTH }),
	);
};
