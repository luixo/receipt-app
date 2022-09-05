import { TRPCInfiniteQueryInput, TRPCQueryOutput } from "app/trpc";

export type UsersResult = TRPCQueryOutput<"users.getPaged">;
export type User = UsersResult["items"][number];
export type Input = TRPCInfiniteQueryInput<"users.getPaged">;
