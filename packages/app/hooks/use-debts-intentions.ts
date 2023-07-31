import { trpc } from "app/trpc";

export const useDebtsIntentions = () => {
	const intentions = trpc.debts.getIntentions.useQuery();
	return intentions.status === "success" ? intentions.data.length : 0;
};
