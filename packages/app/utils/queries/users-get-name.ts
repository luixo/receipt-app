import { TRPCQueryInput, TRPCReactContext } from "app/trpc";

export type UsersGetNameInput = TRPCQueryInput<"users.get-name">;

export const addUserName = (
	trpc: TRPCReactContext,
	input: UsersGetNameInput,
	nextName: string
) => {
	trpc.setQueryData(["users.get-name", input], nextName);
};

export const removeUserName = (
	trpc: TRPCReactContext,
	input: UsersGetNameInput
) => {
	trpc.invalidateQueries(["users.get-name", input]);
};
