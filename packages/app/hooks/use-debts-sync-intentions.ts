import { trpc } from "app/trpc";

export const useDebtsSyncIntentions = () => {
	const intentions = trpc.debtsSyncIntentions.getAll.useQuery();
	return intentions.status === "success" ? intentions.data.inbound.length : 0;
};
