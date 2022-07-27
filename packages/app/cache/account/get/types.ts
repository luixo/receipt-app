import { TRPCQueryOutput } from "app/trpc";

export type Account = TRPCQueryOutput<"account.get">;
