import { TRPCQueryOutput } from "app/trpc";

export type AllDebts = TRPCQueryOutput<"debts.getByUsers">;
export type Debts = AllDebts[number]["debts"];
export type Debt = Debts[number];
