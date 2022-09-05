import { trpc } from "app/trpc";

export const useConnectionIntentions = () => {
	const connections = trpc.useQuery(["accountConnectionIntentions.getAll"]);
	return connections.status === "success" ? connections.data.inbound.length : 0;
};
