import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "#app/utils/trpc.ts";

export const useDebtsIntentions = () => {
	const trpc = useTRPC();
	const { data: inboundDebts } = useSuspenseQuery(
		trpc.debtIntentions.getAll.queryOptions(),
	);
	return inboundDebts.items.length;
};
