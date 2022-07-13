import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";

type User = TRPCQueryOutput<"users.get">;
export type UsersGetInput = TRPCQueryInput<"users.get">;

export const getUserById = (trpc: TRPCReactContext, input: UsersGetInput) =>
	trpc.getQueryData(["users.get", input]);

export const updateUser = (
	trpc: TRPCReactContext,
	input: UsersGetInput,
	updater: (user: User) => User | undefined
) => {
	const prevUser = trpc.getQueryData(["users.get", input]);
	if (!prevUser) {
		return;
	}
	const nextUser = updater(prevUser);
	if (!nextUser) {
		trpc.invalidateQueries(["users.get", input]);
		return;
	}
	trpc.setQueryData(["users.get", input], nextUser);
};
