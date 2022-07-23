import { cache, Cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";

type PagedUserSnapshot = TRPCQueryOutput<"users.get-paged">["items"][number];
type UserSnapshot = TRPCQueryOutput<"users.get">;

const applyPagedUpdate = (
	item: PagedUserSnapshot,
	update: TRPCMutationInput<"users.update">["update"]
): PagedUserSnapshot => {
	switch (update.type) {
		case "name":
			return { ...item, name: update.name };
		case "publicName":
			return { ...item, publicName: update.publicName };
	}
};

const applyUpdate = (
	item: UserSnapshot,
	update: TRPCMutationInput<"users.update">["update"]
): UserSnapshot => {
	switch (update.type) {
		case "name":
			return { ...item, name: update.name };
		case "publicName":
			return { ...item, publicName: update.publicName };
	}
};

const getRevert =
	(
		snapshot: UserSnapshot,
		update: TRPCMutationInput<"users.update">["update"]
	): Revert<UserSnapshot> =>
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
		snapshot: PagedUserSnapshot,
		update: TRPCMutationInput<"users.update">["update"]
	): Revert<PagedUserSnapshot> =>
	(user) => {
		switch (update.type) {
			case "name":
				return { ...user, name: snapshot.name };
			case "publicName":
				return { ...user, publicName: snapshot.publicName };
		}
	};

export const updateMutationOptions: UseContextedMutationOptions<
	"users.update",
	{ pagedRevert?: Revert<PagedUserSnapshot>; revert?: Revert<UserSnapshot> },
	{ pagedInput: Cache.Users.GetPaged.Input; input: Cache.Users.Get.Input }
> = {
	onMutate:
		(trpcContext, { pagedInput, input }) =>
		(updateObject) => {
			const pagedSnapshot = cache.users.getPaged.update(
				trpcContext,
				pagedInput,
				updateObject.id,
				(user) => applyPagedUpdate(user, updateObject.update)
			);
			const snapshot = cache.users.get.update(trpcContext, input, (user) =>
				applyUpdate(user, updateObject.update)
			);
			return {
				pagedSnapshot:
					pagedSnapshot && getPagedRevert(pagedSnapshot, updateObject.update),
				revert: snapshot && getRevert(snapshot, updateObject.update),
			};
		},
	onError:
		(trpcContext, { pagedInput, input }) =>
		(_error, _variables, { pagedRevert, revert } = {}) => {
			if (pagedRevert) {
				cache.users.getPaged.update(
					trpcContext,
					pagedInput,
					input.id,
					pagedRevert
				);
			}
			if (revert) {
				cache.users.get.update(trpcContext, input, revert);
			}
		},
};
