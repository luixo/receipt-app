import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { UsersId } from "~db/models";

import {
	invalidateSuggest as invalidateSuggestUsers,
	updateRevert as updateRevertUsers,
} from "../cache/users";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

type UserSnapshot = TRPCQueryOutput<"users.get">;

const applyUpdate =
	(
		update: TRPCMutationInput<"users.update">["update"],
	): UpdateFn<UserSnapshot> =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "publicName":
				return { ...item, publicName: update.publicName };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"users.update">["update"],
	): SnapshotFn<UserSnapshot> =>
	(snapshot) =>
	(user) => {
		switch (update.type) {
			case "name":
				return { ...user, name: snapshot.name };
			case "publicName":
				return { ...user, publicName: snapshot.publicName };
		}
	};

type OwnUserSnapshot = Exclude<
	TRPCQueryOutput<"users.getForeign">,
	{ remoteId: UsersId }
>;

const applyForeignUpdate =
	(
		update: TRPCMutationInput<"users.update">["update"],
	): UpdateFn<OwnUserSnapshot> =>
	(user) => {
		if ("remoteId" in user) {
			return user;
		}
		return applyUpdate(update)(user);
	};

const getForeignRevert =
	(
		update: TRPCMutationInput<"users.update">["update"],
	): SnapshotFn<OwnUserSnapshot> =>
	(snapshot) =>
	(user) => {
		if ("remoteId" in user || "remoteId" in snapshot) {
			return user;
		}
		return getRevert(update)(snapshot)(user);
	};

export const options: UseContextedMutationOptions<"users.update"> = {
	mutationKey: "users.update",
	onMutate: (controllerContext) => (updateObject) =>
		updateRevertUsers(controllerContext, {
			get: (controller) =>
				controller.update(
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update),
				),
			getForeign: (controller) =>
				controller.updateOwn(
					updateObject.id,
					applyForeignUpdate(updateObject.update),
					getForeignRevert(updateObject.update),
				),
			getPaged: undefined,
		}),
	onSuccess: (controllerContext) => () =>
		invalidateSuggestUsers(controllerContext),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.updateUser.error", {
				ns: "users",
				usersAmount: errors.length,
				errors,
			}),
		}),
};
