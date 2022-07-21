import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import {
	UsersGetInput,
	updateUser,
	getUserById,
} from "app/utils/queries/users-get";
import {
	getPagedUserById,
	updatePagedUsers,
	UsersGetPagedInput,
} from "app/utils/queries/users-get-paged";

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

export const updateMutationOptions: UseContextedMutationOptions<
	"users.update",
	{ pagedSnapshot?: PagedUserSnapshot; snapshot?: UserSnapshot },
	{ pagedInput: UsersGetPagedInput; input: UsersGetInput }
> = {
	onMutate:
		(trpcContext, { pagedInput, input }) =>
		(updateObject) => {
			const pagedSnapshot = getPagedUserById(
				trpcContext,
				pagedInput,
				updateObject.id
			);
			updatePagedUsers(trpcContext, pagedInput, (items) =>
				items.map((item) =>
					item.id === updateObject.id
						? applyPagedUpdate(item, updateObject.update)
						: item
				)
			);
			const snapshot = getUserById(trpcContext, input);
			updateUser(trpcContext, input, (user) =>
				applyUpdate(user, updateObject.update)
			);
			return {
				pagedSnapshot: pagedSnapshot?.user,
				snapshot,
			};
		},
	onError:
		(trpcContext, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedUsers(trpcContext, pagedInput, (page) =>
					page.map((lookupUser) =>
						lookupUser.id === pagedSnapshot.id ? pagedSnapshot : lookupUser
					)
				);
			}
			if (snapshot) {
				updateUser(trpcContext, input, () => snapshot);
			}
		},
};
