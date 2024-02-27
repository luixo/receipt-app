import { trpc } from "~app/trpc";

export const useReceiptTransfersIntentions = () => {
	const intentions = trpc.receiptTransferIntentions.getAll.useQuery();
	return intentions.status === "success" ? intentions.data.inbound.length : 0;
};
