import { TRPCQueryInput, TRPCReactContext } from "app/trpc";

export type UsersGetNameInput = TRPCQueryInput<"users.get-name">;

export const updateUserName = (
	trpc: TRPCReactContext,
	input: UsersGetNameInput,
	nextName: string
) => {
	trpc.setQueryData(["users.get-name", input], nextName);
};
