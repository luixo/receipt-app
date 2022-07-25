import { TRPCQueryOutput } from "app/trpc";

export type UsersResult = TRPCQueryOutput<"users.get-not-connected">;
export type User = UsersResult["items"][number];
