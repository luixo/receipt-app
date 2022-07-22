import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { UsersGetInput, updateUser } from "app/utils/queries/users-get";
import {
	updatePagedUser,
	UsersGetPagedInput,
} from "app/utils/queries/users-get-paged";
import { Revert } from "app/utils/queries/utils";

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
	{ pagedInput: UsersGetPagedInput; input: UsersGetInput }
> = {
	onMutate:
		(trpcContext, { pagedInput, input }) =>
		(updateObject) => {
			const pagedSnapshot = updatePagedUser(
				trpcContext,
				pagedInput,
				updateObject.id,
				(user) => applyPagedUpdate(user, updateObject.update)
			);
			const snapshot = updateUser(trpcContext, input, (user) =>
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
				updatePagedUser(trpcContext, pagedInput, input.id, pagedRevert);
			}
			if (revert) {
				updateUser(trpcContext, input, revert);
			}
		},
};
