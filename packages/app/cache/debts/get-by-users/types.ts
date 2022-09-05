import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

export type AllDebts = TRPCQueryOutput<"debts.getByUsers">;
export type Debts = AllDebts[UsersId];
export type Debt = Debts[number];
