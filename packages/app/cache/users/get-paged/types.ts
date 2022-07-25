import { TRPCQueryOutput } from "app/trpc";

export type UsersResult = TRPCQueryOutput<"users.get-paged">;
export type User = UsersResult["items"][number];
