import {
	TRPCInfiniteQueryCursor,
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
} from "app/trpc";

export type UsersResult = TRPCQueryOutput<"users.get-not-connected">;
export type User = UsersResult["items"][number];
export type UsersGetPagedInput =
	TRPCInfiniteQueryInput<"users.get-not-connected">;
export type UsersGetPagedCursor =
	TRPCInfiniteQueryCursor<"users.get-not-connected">;
