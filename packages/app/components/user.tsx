import React from "react";
import { trpc, TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text } from "../utils/styles";
import { MutationWrapper } from "./utils/mutation-wrapper";
import { RemoveButton } from "./utils/remove-button";
import {
	useTrpcMutationOptions,
	UseContextedMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import {
	getPagedUserById,
	updatePagedUsers,
	UsersGetPagedInput,
} from "../utils/queries/users-get-paged";
import {
	getUserById,
	updateUser,
	UsersGetInput,
} from "../utils/queries/users-get";
import { useRouter } from "solito/router";
import { useAsyncCallback } from "../hooks/use-async-callback";

type PagedUserSnapshot = TRPCQueryOutput<"users.get-paged">[number];
type UserSnapshot = TRPCQueryOutput<"users.get">;

const deleteMutationOptions: UseContextedMutationOptions<
	"users.delete",
	{
		pagedSnapshot?: {
			pageIndex: number;
			userIndex: number;
			user: PagedUserSnapshot;
		};
		snapshot?: UserSnapshot;
	},
	{
		pagedInput: UsersGetPagedInput;
		input: UsersGetInput;
	}
> = {
	onMutate:
		(trpc, { pagedInput, input }) =>
		({ id }) => {
			const pagedSnapshot = getPagedUserById(trpc, pagedInput, id);
			const snapshot = getUserById(trpc, input);
			updatePagedUsers(trpc, pagedInput, (userPage) =>
				userPage.filter((user) => user.id !== id)
			);
			updateUser(trpc, input, () => undefined);
			return { pagedSnapshot, snapshot };
		},
	onError:
		(trpc, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedUsers(trpc, pagedInput, (userPage, pageIndex) => {
					if (pageIndex !== pagedSnapshot.pageIndex) {
						return userPage;
					}
					return [
						...userPage.slice(0, pagedSnapshot.userIndex),
						pagedSnapshot.user,
						...userPage.slice(pagedSnapshot.userIndex),
					];
				});
			}
			if (snapshot) {
				updateUser(trpc, input, () => snapshot);
			}
		},
};

type Props = {
	data: TRPCQueryOutput<"users.get">;
	pagedInput: UsersGetPagedInput;
	input: UsersGetInput;
};

export const User: React.FC<Props> = ({ data: user, pagedInput, input }) => {
	const router = useRouter();
	const deleteUserMutation = trpc.useMutation(
		"users.delete",
		useTrpcMutationOptions(deleteMutationOptions, { pagedInput, input })
	);
	const deleteUser = useAsyncCallback(
		async (isMount) => {
			await deleteUserMutation.mutateAsync({ id: user.id });
			if (!isMount()) {
				return;
			}
			router.replace("/users");
		},
		[deleteUserMutation, user.id]
	);
	return (
		<Block>
			<Text>{user.name}</Text>
			{user.publicName !== user.name ? (
				<Text>Public name: {user.publicName}</Text>
			) : null}
			{user.email ? <Text>Connected with email: {user.email}</Text> : null}
			<RemoveButton onPress={deleteUser} disabled={user.dirty}>
				Remove user
			</RemoveButton>
			<MutationWrapper<"users.delete"> mutation={deleteUserMutation}>
				{() => <Text>Remove success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
