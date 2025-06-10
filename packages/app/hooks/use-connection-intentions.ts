import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~app/utils/trpc";

export const useConnectionIntentions = () => {
	const trpc = useTRPC();
	const connections = useQuery(
		trpc.accountConnectionIntentions.getAll.queryOptions(undefined, {
			trpc: { ssr: false },
		}),
	);
	return connections.status === "success" ? connections.data.inbound.length : 0;
};
