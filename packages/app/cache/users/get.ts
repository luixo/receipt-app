import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/db/models";

type Controller = utils.GenericController<"users.get">;

type User = TRPCQueryOutput<"users.get">;

const update =
	(controller: Controller, userId: UsersId) =>
	(updater: utils.UpdateFn<User>) =>
		utils.withRef<User | undefined>((ref) => {
			controller.update((input, user) => {
				if (input.id !== userId) {
					return;
				}
				ref.current = user;
				return updater(user);
			});
		});

const upsert = (controller: Controller, user: User) =>
	controller.upsert({ id: user.remoteId }, user);

const remove = (controller: Controller, userId: UsersId) =>
	utils.withRef<User | undefined>((ref) => {
		controller.invalidate((input, user) => {
			if (input.id !== userId) {
				return false;
			}
			ref.current = user;
			return true;
		});
	});

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "users.get");
	return {
		update: (userId: UsersId, updater: utils.UpdateFn<User>) =>
			update(controller, userId)(updater),
		add: (user: User) => upsert(controller, user),
		remove: (userId: UsersId) => remove(controller, userId),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "users.get");
	return {
		update: (
			userId: UsersId,
			updater: utils.UpdateFn<User>,
			revertUpdater: utils.SnapshotFn<User>
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, userId),
				updater,
				revertUpdater
			),
		add: (user: User) =>
			utils.applyWithRevert(
				() => upsert(controller, user),
				() => remove(controller, user.remoteId)
			),
		remove: (userId: UsersId) =>
			utils.applyWithRevert(
				() => remove(controller, userId),
				(snapshot) => upsert(controller, snapshot)
			),
	};
};
