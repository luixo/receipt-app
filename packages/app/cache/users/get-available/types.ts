import { TRPCQueryOutput } from "app/trpc";

export type AvailableUsersResult = TRPCQueryOutput<"users.get-available">;
export type AvailableUser = AvailableUsersResult["items"][number];
