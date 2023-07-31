import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/db/models";

type Controller = TRPCReactContext["users"]["get"];

type User = TRPCQueryOutput<"users.get">;

const update =
	(controller: Controller, userId: UsersId) =>
	(updater: utils.UpdateFn<User>) =>
		utils.withRef<User | undefined>((ref) => {
			controller.setData({ id: userId }, (user) => {
				if (!user) {
					return;
				}
				ref.current = user;
				return updater(user);
			});
		}).current;

const upsert = (controller: Controller, user: User) =>
	controller.setData({ id: user.remoteId }, user);

const remove = (controller: Controller, userId: UsersId) =>
	utils.withRef<User | undefined>((ref) => {
		ref.current = controller.getData({ id: userId });
		controller.invalidate({ id: userId });
	}).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.users.get;
	return {
		update: (userId: UsersId, updater: utils.UpdateFn<User>) =>
			update(controller, userId)(updater),
		add: (user: User) => upsert(controller, user),
		remove: (userId: UsersId) => remove(controller, userId),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.users.get;
	return {
		update: (
			userId: UsersId,
			updater: utils.UpdateFn<User>,
			revertUpdater: utils.SnapshotFn<User>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, userId),
				updater,
				revertUpdater,
			),
		add: (user: User) =>
			utils.applyWithRevert(
				() => upsert(controller, user),
				() => remove(controller, user.remoteId),
			),
		remove: (userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, userId),
				(snapshot) => upsert(controller, snapshot),
			),
	};
};
