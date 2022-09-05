import { TRPCQueryOutput } from "app/trpc";

export type Participants = TRPCQueryOutput<"debts.getReceipt">;
export type Participant = Participants[number];
