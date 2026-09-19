import type { TRPCMutationInput } from "~app/trpc";
import type { ForeignUser, User } from "~app/trpc-types";
import type { UserId } from "~db/ids";

import {
	invalidateSuggest as invalidateSuggestUsers,
	updateRevert as updateRevertUsers,
} from "../cache/users";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

const applyUpdate =
	(update: TRPCMutationInput<"users.update">["update"]): UpdateFn<User> =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "publicName":
				return { ...item, publicName: update.publicName };
		}
	};

const getRevert =
	(update: TRPCMutationInput<"users.update">["update"]): SnapshotFn<User> =>
	(snapshot) =>
	(user) => {
		switch (update.type) {
			case "name":
				return { ...user, name: snapshot.name };
			case "publicName":
				return { ...user, publicName: snapshot.publicName };
		}
	};

type OwnUserSnapshot = Exclude<ForeignUser, { remoteId: UserId }>;

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
