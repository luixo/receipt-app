import { trpc } from "app/trpc";

export const useNonResolvedReceipts = () => {
	const intentions = trpc.useQuery(["receipts.get-non-resolved-amount"]);
	return intentions.status === "success" ? intentions.data : 0;
};
