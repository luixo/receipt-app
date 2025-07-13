import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~app/utils/trpc";

export const useConnectionIntentions = () => {
	const trpc = useTRPC();
	const connections = useQuery(
		trpc.accountConnectionIntentions.getAll.queryOptions(),
	);
	return connections.status === "success" ? connections.data.inbound.length : 0;
};
