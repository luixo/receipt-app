import { TRPCQueryInput, TRPCQueryOutput } from "app/trpc";

export type Receipt = TRPCQueryOutput<"receipts.getPaged">["items"][number];
export type Input = TRPCQueryInput<"receipts.getPaged">;
