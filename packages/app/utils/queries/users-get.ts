import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";

type User = TRPCQueryOutput<"users.get">;
export type UsersGetInput = TRPCQueryInput<"users.get">;

const getUserById = (trpc: TRPCReactContext, input: UsersGetInput) =>
	trpc.getQueryData(["users.get", input]);

export const addUser = (
	trpc: TRPCReactContext,
	input: UsersGetInput,
	nextUser: User
) => {
	trpc.setQueryData(["users.get", input], nextUser);
};

export const removeUser = (trpc: TRPCReactContext, input: UsersGetInput) => {
	trpc.invalidateQueries(["users.get", input]);
};

export const updateUser = (
	trpc: TRPCReactContext,
	input: UsersGetInput,
	updater: (user: User) => User
) => {
	const user = getUserById(trpc, input);
	if (!user) {
		return;
	}
	addUser(trpc, input, updater(user));
	return user;
};
