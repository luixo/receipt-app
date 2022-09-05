import { trpc } from "app/trpc";

export const useNonResolvedReceipts = () => {
	const intentions = trpc.useQuery(["receipts.getNonResolvedAmount"]);
	return intentions.status === "success" ? intentions.data : 0;
};
