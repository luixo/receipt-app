import { TRPCInfiniteQueryInput } from "../../trpc";

export type UsersGetPagedInput = TRPCInfiniteQueryInput<"users.get-paged">;

export const DEFAULT_INPUT: UsersGetPagedInput = {
	limit: 10,
};
