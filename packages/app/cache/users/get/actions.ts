import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { User, UsersGetInput } from "./types";

export const add = (trpc: TRPCReactContext, input: UsersGetInput, user: User) =>
	createController(trpc, input).set(user);
export const remove = (trpc: TRPCReactContext, input: UsersGetInput) =>
	createController(trpc, input).invalidate();

export const update = (
	trpc: TRPCReactContext,
	input: UsersGetInput,
	updater: (user: User) => User
) => {
	const modifiedUserRef = createRef<User | undefined>();
	createController(trpc, input).update((user) => {
		modifiedUserRef.current = user;
		return updater(user);
	});
	return modifiedUserRef.current;
};
