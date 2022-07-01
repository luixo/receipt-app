import React from "react";
import * as ReactNative from "react-native";
import { trpc, TRPCMutationInput, TRPCQueryOutput } from "../trpc";
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
import { VALIDATIONS_CONSTANTS } from "../utils/validation";

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

const updateMutationOptions: UseContextedMutationOptions<
	"users.update",
	{ pagedSnapshot?: PagedUserSnapshot; snapshot?: UserSnapshot },
	{ pagedInput: UsersGetPagedInput; input: UsersGetInput }
> = {
	onMutate:
		(trpc, { pagedInput, input }) =>
		(updateObject) => {
			const pagedSnapshot = getPagedUserById(trpc, pagedInput, updateObject.id);
			updatePagedUsers(trpc, pagedInput, (items) =>
				items.map((item) =>
					item.id === updateObject.id
						? applyPagedUpdate(item, updateObject.update)
						: item
				)
			);
			const snapshot = getUserById(trpc, input);
			updateUser(trpc, input, (user) =>
				applyUpdate({ ...user, dirty: true }, updateObject.update)
			);
			return {
				pagedSnapshot: pagedSnapshot?.user,
				snapshot,
			};
		},
	onSuccess:
		(trpc, { input }) =>
		() => {
			updateUser(trpc, input, (user) => ({ ...user, dirty: false }));
		},
	onError:
		(trpc, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedUsers(trpc, pagedInput, (page) =>
					page.map((lookupUser) =>
						lookupUser.id === pagedSnapshot.id ? pagedSnapshot : lookupUser
					)
				);
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

	const updateUserMutation = trpc.useMutation(
		"users.update",
		useTrpcMutationOptions(updateMutationOptions, { pagedInput, input })
	);
	const promptNameParam = React.useCallback(
		(isPublic: boolean) => {
			const prevName = isPublic ? user.publicName : user.name;
			const nextName = window.prompt("Please enter new name", prevName);
			if (
				!nextName ||
				nextName.length < VALIDATIONS_CONSTANTS.userName.min ||
				nextName.length > VALIDATIONS_CONSTANTS.userName.max
			) {
				return window.alert(
					`Name length should be between ${VALIDATIONS_CONSTANTS.userName.min} and ${VALIDATIONS_CONSTANTS.userName.max}!`
				);
			}
			if (nextName === prevName) {
				return;
			}
			updateUserMutation.mutate({
				id: user.id,
				update: isPublic
					? { type: "publicName", publicName: nextName }
					: { type: "name", name: nextName },
			});
			if (!isPublic && user.name === user.publicName) {
				updateUserMutation.mutate({
					id: user.id,
					update: { type: "publicName", publicName: nextName },
				});
			}
		},
		[updateUserMutation, user.id, user.name, user.publicName]
	);

	const promptPublicName = React.useCallback(
		() => promptNameParam(true),
		[promptNameParam, user.publicName]
	);
	const promptName = React.useCallback(
		() => promptNameParam(false),
		[promptNameParam, user.name]
	);

	return (
		<Block>
			<ReactNative.TouchableOpacity disabled={user.dirty} onPress={promptName}>
				<Text>{user.name}</Text>
			</ReactNative.TouchableOpacity>

			<ReactNative.TouchableOpacity
				disabled={user.dirty}
				onPress={promptPublicName}
			>
				{user.publicName !== user.name ? (
					<Text>Public name: {user.publicName}</Text>
				) : (
					<Text>Add public name</Text>
				)}
			</ReactNative.TouchableOpacity>

			{user.email ? <Text>Connected with email: {user.email}</Text> : null}
			<RemoveButton onPress={deleteUser} disabled={user.dirty}>
				Remove user
			</RemoveButton>
			<MutationWrapper<"users.delete"> mutation={deleteUserMutation}>
				{() => <Text>Remove success!</Text>}
			</MutationWrapper>
			<MutationWrapper<"users.update"> mutation={updateUserMutation}>
				{() => <Text>Update success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
