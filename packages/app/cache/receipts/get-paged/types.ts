import { TRPCQueryOutput } from "app/trpc";

export type ReceiptsResult = TRPCQueryOutput<"receipts.get-paged">;
export type Receipt = ReceiptsResult["items"][number];
