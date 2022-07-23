import { TRPCQueryInput, TRPCQueryOutput } from "app/trpc";

export type Receipt = TRPCQueryOutput<"receipts.get">;
export type ReceiptsGetInput = TRPCQueryInput<"receipts.get">;
