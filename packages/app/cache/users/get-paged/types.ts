import {
	TRPCInfiniteQueryCursor,
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
} from "app/trpc";

export type UsersResult = TRPCQueryOutput<"users.get-paged">;
export type User = UsersResult["items"][number];
export type UsersGetPagedInput = TRPCInfiniteQueryInput<"users.get-paged">;
export type UsersGetPagedCursor = TRPCInfiniteQueryCursor<"users.get-paged">;
