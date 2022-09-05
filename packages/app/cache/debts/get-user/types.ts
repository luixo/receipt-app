import { TRPCQueryOutput } from "app/trpc";

export type Debts = TRPCQueryOutput<"debts.getUser">;
export type Debt = Debts[number];
