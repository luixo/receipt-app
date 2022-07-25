import { TRPCQueryOutput } from "app/trpc";

export type Receipt = TRPCQueryOutput<"receipts.get">;
