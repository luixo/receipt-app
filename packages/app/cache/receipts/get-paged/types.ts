import { TRPCInfiniteQueryInput, TRPCQueryOutput } from "app/trpc";

export type ReceiptsResult = TRPCQueryOutput<"receipts.getPaged">;
export type Receipt = ReceiptsResult["items"][number];
export type Input = TRPCInfiniteQueryInput<"receipts.getPaged">;
