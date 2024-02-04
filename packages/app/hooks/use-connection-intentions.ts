import { trpc } from "app/trpc";

export const useConnectionIntentions = () => {
	const connections = trpc.accountConnectionIntentions.getAll.useQuery(
		undefined,
		{ trpc: { ssr: false } },
	);
	return connections.status === "success" ? connections.data.inbound.length : 0;
};
