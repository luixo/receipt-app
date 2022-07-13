import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";

type Receipt = TRPCQueryOutput<"receipts.get">;
export type ReceiptsGetInput = TRPCQueryInput<"receipts.get">;

export const getReceiptById = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput
) => trpc.getQueryData(["receipts.get", input]);

export const addReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput,
	receipt: Receipt
) => {
	trpc.setQueryData(["receipts.get", input], receipt);
};

export const updateReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput,
	updater: (receipt: Receipt) => Receipt | undefined
) => {
	const prevReceipt = trpc.getQueryData(["receipts.get", input]);
	if (!prevReceipt) {
		return;
	}
	const nextReceipt = updater(prevReceipt);
	if (!nextReceipt) {
		trpc.invalidateQueries(["receipts.get", input]);
		return;
	}
	trpc.setQueryData(["receipts.get", input], nextReceipt);
};
