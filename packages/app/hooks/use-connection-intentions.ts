import { trpc } from "app/trpc";

export const useConnectionIntentions = () => {
	const connections = trpc.useQuery(["account-connection-intentions.get-all"]);
	return connections.status === "success" ? connections.data.inbound.length : 0;
};
