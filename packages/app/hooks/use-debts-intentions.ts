import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~app/utils/trpc";

export const useDebtsIntentions = () => {
	const trpc = useTRPC();
	const intentions = useQuery(
		trpc.debtIntentions.getAll.queryOptions(undefined, {
			trpc: { ssr: false },
		}),
	);
	return intentions.status === "success" ? intentions.data.length : 0;
};
