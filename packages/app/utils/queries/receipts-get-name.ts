import { TRPCQueryInput, TRPCReactContext } from "app/trpc";

export type ReceiptsGetNameInput = TRPCQueryInput<"receipts.get-name">;

export const updateReceiptName = (
	trpc: TRPCReactContext,
	input: ReceiptsGetNameInput,
	nextName: string
) => {
	trpc.setQueryData(["receipts.get-name", input], nextName);
};
