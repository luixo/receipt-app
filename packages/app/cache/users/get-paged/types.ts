import { TRPCInfiniteQueryInput, TRPCQueryOutput } from "app/trpc";

export type UsersResult = TRPCQueryOutput<"users.get-paged">;
export type User = UsersResult["items"][number];
export type Input = TRPCInfiniteQueryInput<"users.get-paged">;
