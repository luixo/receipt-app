import { TRPCQueryInput, TRPCQueryOutput } from "app/trpc";

export type User = TRPCQueryOutput<"users.get">;
export type UsersGetInput = TRPCQueryInput<"users.get">;
