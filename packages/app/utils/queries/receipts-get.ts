import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";

type Receipt = TRPCQueryOutput<"receipts.get">;
export type ReceiptsGetInput = TRPCQueryInput<"receipts.get">;

const getReceipt = (trpc: TRPCReactContext, input: ReceiptsGetInput) =>
	trpc.getQueryData(["receipts.get", input]);
const setReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput,
	data: Receipt
) => trpc.setQueryData(["receipts.get", input], data);

export const removeReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput
) => trpc.invalidateQueries(["receipts.get", input]);

export const addReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput,
	nextReceipt: Receipt
) => {
	setReceipt(trpc, input, nextReceipt);
};

export const updateReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput,
	updater: (user: Receipt) => Receipt
) => {
	const receipt = getReceipt(trpc, input);
	if (!receipt) {
		return;
	}
	setReceipt(trpc, input, updater(receipt));
	return receipt;
};
