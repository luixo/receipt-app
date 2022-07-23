import { TRPCInfiniteQueryInput, TRPCQueryOutput } from "app/trpc";

export type AvailableUsersResult = TRPCQueryOutput<"users.get-available">;
export type AvailableUser = AvailableUsersResult["items"][number];
export type GetAvailableUsersInput =
	TRPCInfiniteQueryInput<"users.get-available">;
