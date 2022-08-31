import { TRPCQueryOutput } from "app/trpc";

export type Participants = TRPCQueryOutput<"debts.get-receipt">;
export type Participant = Participants[number];
