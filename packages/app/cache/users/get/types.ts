import { TRPCQueryOutput } from "app/trpc";

export type User = TRPCQueryOutput<"users.get">;
