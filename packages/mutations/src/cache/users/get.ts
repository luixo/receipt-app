import type { TRPCQueryOutput, TRPCReactUtils } from "~app/trpc";
import type { UsersId } from "~db/models";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, applyWithRevert, withRef } from "../utils";

type Controller = TRPCReactUtils["users"]["get"];

type User = TRPCQueryOutput<"users.get">;

const update =
	(controller: Controller, userId: UsersId) => (updater: UpdateFn<User>) =>
		withRef<User | undefined>((ref) => {
			controller.setData({ id: userId }, (user) => {
				if (!user) {
					return;
				}
				ref.current = user;
				return updater(user);
			});
		}).current;

const upsert = (controller: Controller, user: User) =>
	controller.setData({ id: user.id }, user);

const remove = (controller: Controller, userId: UsersId) =>
	withRef<User | undefined>((ref) => {
		ref.current = controller.getData({ id: userId });
		return controller.invalidate({ id: userId });
	}).current;

export const getController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.users.get;
	return {
		update: (userId: UsersId, updater: UpdateFn<User>) =>
			update(controller, userId)(updater),
		add: (user: User) => upsert(controller, user),
		remove: (userId: UsersId) => remove(controller, userId),
	};
};

export const getRevertController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.users.get;
	return {
		update: (
			userId: UsersId,
			updater: UpdateFn<User>,
			revertUpdater: SnapshotFn<User>,
		) =>
			applyUpdateFnWithRevert(
				update(controller, userId),
				updater,
				revertUpdater,
			),
		add: (user: User) =>
			applyWithRevert(
				() => upsert(controller, user),
				() => remove(controller, user.id),
			),
		remove: (userId: UsersId) =>
			applyWithRevert(
				() => remove(controller, userId),
				(snapshot) => upsert(controller, snapshot),
			),
	};
};
