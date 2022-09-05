import { trpc } from "app/trpc";

export const useDebtsSyncIntentions = () => {
	const intentions = trpc.useQuery(["debtsSyncIntentions.getAll"]);
	return intentions.status === "success" ? intentions.data.inbound.length : 0;
};
