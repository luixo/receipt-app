import { trpc } from "app/trpc";

export const useDebtsSyncIntentions = () => {
	const intentions = trpc.useQuery(["debts-sync-intentions.get-all"]);
	return intentions.status === "success" ? intentions.data.inbound.length : 0;
};
