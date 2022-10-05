import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/db/models";

type Controller = utils.GenericController<"users.getName">;

type UserName = TRPCQueryOutput<"users.getName">;

const uspert = (controller: Controller, userId: UsersId, name: UserName) =>
	controller.upsert({ id: userId }, name);

const remove = (controller: Controller, userId: UsersId) =>
	utils.withRef<UserName | undefined>((ref) => {
		controller.invalidate((input, user) => {
			if (input.id !== userId) {
				return false;
			}
			ref.current = user;
			return true;
		});
	}).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "users.getName");
	return {
		upsert: (userId: UsersId, name: UserName) =>
			uspert(controller, userId, name),
		remove: (userId: UsersId) => remove(controller, userId),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "users.getName");
	return {
		upsert: (userId: UsersId, name: UserName) =>
			utils.applyWithRevert(
				() => uspert(controller, userId, name),
				() => remove(controller, userId)
			),
		remove: (userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, userId),
				(snapshot) => uspert(controller, userId, snapshot)
			),
	};
};
