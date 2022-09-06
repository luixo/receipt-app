import { trpc } from "app/trpc";

export const useConnectionIntentions = () => {
	const connections = trpc.accountConnectionIntentions.getAll.useQuery();
	return connections.status === "success" ? connections.data.inbound.length : 0;
};
