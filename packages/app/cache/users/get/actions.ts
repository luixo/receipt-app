import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { createController } from "./controller";
import { User } from "./types";

export const add = (trpc: TRPCReactContext, user: User) =>
	createController(trpc, user.remoteId).set(user);
export const remove = (trpc: TRPCReactContext, userId: UsersId) =>
	createController(trpc, userId).invalidate();

export const update = (
	trpc: TRPCReactContext,
	userId: UsersId,
	updater: (user: User) => User
) => {
	const modifiedUserRef = createRef<User | undefined>();
	createController(trpc, userId).update((user) => {
		modifiedUserRef.current = user;
		return updater(user);
	});
	return modifiedUserRef.current;
};
