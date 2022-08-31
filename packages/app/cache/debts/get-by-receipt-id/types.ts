import { TRPCQueryOutput } from "app/trpc";

export type Debt = TRPCQueryOutput<"debts.get">;
