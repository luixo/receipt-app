import { trpc } from "app/trpc";

export const useNonResolvedReceipts = () => {
	const intentions = trpc.receipts.getNonResolvedAmount.useQuery();
	return intentions.status === "success" ? intentions.data : 0;
};
