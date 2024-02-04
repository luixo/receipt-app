import { trpc } from "app/trpc";

export const useNonResolvedReceipts = () => {
	const intentions = trpc.receipts.getNonResolvedAmount.useQuery(undefined, {
		trpc: { ssr: false },
	});
	return intentions.status === "success" ? intentions.data : 0;
};
