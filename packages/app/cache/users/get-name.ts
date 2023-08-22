import * as utils from "app/cache/utils";
import type { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import type { UsersId } from "next-app/db/models";

type Controller = TRPCReactContext["users"]["getName"];

type UserName = TRPCQueryOutput<"users.getName">;

const uspert = (controller: Controller, userId: UsersId, name: UserName) =>
	controller.setData({ id: userId }, name);

const remove = (controller: Controller, userId: UsersId) =>
	utils.withRef<UserName | undefined>((ref) => {
		ref.current = controller.getData({ id: userId });
		controller.invalidate({ id: userId });
	}).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.users.getName;
	return {
		upsert: (userId: UsersId, name: UserName) =>
			uspert(controller, userId, name),
		remove: (userId: UsersId) => remove(controller, userId),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.users.getName;
	return {
		upsert: (userId: UsersId, name: UserName) =>
			utils.applyWithRevert(
				() => uspert(controller, userId, name),
				() => remove(controller, userId),
			),
		remove: (userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, userId),
				(snapshot) => uspert(controller, userId, snapshot),
			),
	};
};
