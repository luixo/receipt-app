import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~app/utils/trpc";

export const useConnectionIntentions = () => {
	const trpc = useTRPC();
	const connections = useSuspenseQuery(
		trpc.userConnectionIntentions.getAll.queryOptions(),
	);
	return connections.data.inbound.length;
};
