import { cache } from "app/cache";
import { SnapshotFn, UpdateFn } from "app/cache/utils";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";

type PagedUserSnapshot = TRPCQueryOutput<"users.getPaged">["items"][number];
type UserSnapshot = TRPCQueryOutput<"users.get">;

const applyPagedUpdate =
	(
		update: TRPCMutationInput<"users.update">["update"]
	): UpdateFn<PagedUserSnapshot> =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "publicName":
				return { ...item, publicName: update.publicName };
		}
	};

const applyUpdate =
	(
		update: TRPCMutationInput<"users.update">["update"]
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
		update: TRPCMutationInput<"users.update">["update"]
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

const getPagedRevert =
	(
		update: TRPCMutationInput<"users.update">["update"]
	): SnapshotFn<PagedUserSnapshot> =>
	(snapshot) =>
	(user) => {
		switch (update.type) {
			case "name":
				return { ...user, name: snapshot.name };
			case "publicName":
				return { ...user, publicName: snapshot.publicName };
		}
	};

export const options: UseContextedMutationOptions<"users.update"> = {
	onMutate: (trpcContext) => (updateObject) => ({
		revertFns: cache.users.updateRevert(trpcContext, {
			get: (controller) =>
				controller.update(
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update)
				),
			getName: (controller) => {
				if (updateObject.update.type !== "name") {
					return;
				}
				return controller.upsert(updateObject.id, updateObject.update.name);
			},
			getPaged: (controller) =>
				controller.update(
					updateObject.id,
					applyPagedUpdate(updateObject.update),
					getPagedRevert(updateObject.update)
				),
		}),
	}),
	onSuccess: (trpcContext) => () => cache.users.invalidateSuggest(trpcContext),
};
