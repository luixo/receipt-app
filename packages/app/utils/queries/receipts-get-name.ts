import { TRPCQueryInput, TRPCReactContext } from "app/trpc";

export type ReceiptsGetNameInput = TRPCQueryInput<"receipts.get-name">;

export const addReceiptName = (
	trpc: TRPCReactContext,
	input: ReceiptsGetNameInput,
	nextName: string
) => {
	trpc.setQueryData(["receipts.get-name", input], nextName);
};

export const removeReceiptName = (
	trpc: TRPCReactContext,
	input: ReceiptsGetNameInput
) => {
	trpc.invalidateQueries(["receipts.get-name", input]);
};
