import { TRPCQueryOutput } from "app/trpc";

export type Debts = TRPCQueryOutput<"debts.get-user">;
export type Debt = Debts[number];
