import React from "react";
import * as ReactNative from "react-native";

import { useRouter } from "solito/router";
import { v4 } from "uuid";

import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import {
	useTrpcMutationOptions,
	UseContextedMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import {
	updateOutboundIntention,
	updateOutboundIntentions,
} from "app/utils/queries/account-connection-intentions-get-all";
import {
	getUserById,
	updateUser,
	UsersGetInput,
} from "app/utils/queries/users-get";
import {
	getPagedUserById,
	updatePagedUsers,
	UsersGetPagedInput,
	usersGetPagedInputStore,
} from "app/utils/queries/users-get-paged";
import { styled, Text } from "app/utils/styles";
import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { AccountsId } from "next-app/src/db/models";

const Button = styled(ReactNative.Button)({
	padding: "md",
	borderWidth: "light",
	borderColor: "border",
});

type PagedUserSnapshot = TRPCQueryOutput<"users.get-paged">["items"][number];
type UserSnapshot = TRPCQueryOutput<"users.get">;

const cancelRequestMutationOptions: UseContextedMutationOptions<"account-connection-intentions.cancel-request"> =
	{
		onSuccess:
			(trpcContext) =>
			(_result, { userId }) => {
				updateOutboundIntentions(trpcContext, (intentions) =>
					intentions.filter((intention) => intention.userId !== userId)
				);
			},
	};

const unlinkMutationOptions: UseContextedMutationOptions<
	"users.unlink",
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
		(trpcContext, { input, pagedInput }) =>
		({ id }) => {
			const pagedSnapshot = getPagedUserById(trpcContext, pagedInput, id);
			const snapshot = getUserById(trpcContext, input);
			updatePagedUsers(trpcContext, pagedInput, (userPage) =>
				userPage.map((user) =>
					user.id === id ? { ...user, email: null } : user
				)
			);
			updateUser(trpcContext, input, (user) => ({ ...user, email: null }));
			return { pagedSnapshot, snapshot };
		},
	onError:
		(trpcContext, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedUsers(trpcContext, pagedInput, (userPage, pageIndex) => {
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
				updateUser(trpcContext, input, () => snapshot);
			}
		},
};

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
		(trpcContext, { pagedInput, input }) =>
		({ id }) => {
			const pagedSnapshot = getPagedUserById(trpcContext, pagedInput, id);
			const snapshot = getUserById(trpcContext, input);
			updatePagedUsers(trpcContext, pagedInput, (userPage) =>
				userPage.filter((user) => user.id !== id)
			);
			updateUser(trpcContext, input, () => undefined);
			return { pagedSnapshot, snapshot };
		},
	onError:
		(trpcContext, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedUsers(trpcContext, pagedInput, (userPage, pageIndex) => {
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
				updateUser(trpcContext, input, () => snapshot);
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
				applyUpdate({ ...user, dirty: true }, updateObject.update)
			);
			return {
				pagedSnapshot: pagedSnapshot?.user,
				snapshot,
			};
		},
	onSuccess:
		(trpcContext, { input }) =>
		() => {
			updateUser(trpcContext, input, (user) => ({ ...user, dirty: false }));
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

const connectMutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.put",
	AccountsId,
	{ pagedInput: UsersGetPagedInput; input: UsersGetInput }
> = {
	onMutate: (trpcContext) => (variables) => {
		const temporaryAccountId = v4();
		updateOutboundIntentions(trpcContext, (intentions) => [
			...intentions,
			{
				accountId: temporaryAccountId,
				email: variables.email,
				userId: variables.userId,
				userName: "unknown",
			},
		]);
		return temporaryAccountId;
	},
	onSuccess:
		(trpcContext, { input, pagedInput }) =>
		(
			{ id: actualAccountId, userName, connected },
			variables,
			temporaryAccountId
		) => {
			if (connected) {
				updateUser(trpcContext, input, (user) => ({
					...user,
					email: variables.email,
				}));
				updatePagedUsers(trpcContext, pagedInput, (page) =>
					page.map((user) =>
						variables.userId === user.id
							? { ...user, email: variables.email }
							: user
					)
				);
				updateOutboundIntentions(trpcContext, (intentions) =>
					intentions.filter(
						(intention) => intention.accountId !== temporaryAccountId
					)
				);
			} else {
				updateOutboundIntention(
					trpcContext,
					temporaryAccountId,
					(intention) => ({
						...intention,
						accountId: actualAccountId,
						userName,
					})
				);
			}
		},
	onError: (trpcContext) => (_error, _variables, temporaryAccountId) => {
		if (!temporaryAccountId) {
			return;
		}
		updateOutboundIntentions(trpcContext, (intentions) =>
			intentions.filter(
				(intention) => intention.accountId !== temporaryAccountId
			)
		);
	},
};

type Props = {
	data: TRPCQueryOutput<"users.get">;
	input: UsersGetInput;
};

export const User: React.FC<Props> = ({ data: user, input }) => {
	const router = useRouter();
	const usersGetPagedInput = usersGetPagedInputStore();
	const deleteUserMutation = trpc.useMutation(
		"users.delete",
		useTrpcMutationOptions(deleteMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
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
		useTrpcMutationOptions(updateMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
	);
	const promptNameParam = React.useCallback(
		(isPublic: boolean) => {
			const prevName = isPublic ? user.publicName ?? "" : user.name;
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
		},
		[updateUserMutation, user.id, user.name, user.publicName]
	);

	const promptPublicName = React.useCallback(
		() => promptNameParam(true),
		[promptNameParam]
	);
	const promptName = React.useCallback(
		() => promptNameParam(false),
		[promptNameParam]
	);

	const connectionIntentionsQuery = trpc.useQuery([
		"account-connection-intentions.get-all",
	]);
	const hasOutboundConnectionIntention =
		connectionIntentionsQuery.status === "success"
			? connectionIntentionsQuery.data.outbound.some(
					(element) => element.userId === user.id
			  )
			: undefined;
	const connectUserMutation = trpc.useMutation(
		"account-connection-intentions.put",
		useTrpcMutationOptions(connectMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
	);
	const promptConnect = React.useCallback(() => {
		const email = window.prompt("Please enter email to connect to");
		if (!email) {
			return;
		}
		connectUserMutation.mutate({
			userId: user.id,
			email,
		});
	}, [connectUserMutation, user.id]);

	const cancelRequestMutation = trpc.useMutation(
		"account-connection-intentions.cancel-request",
		useTrpcMutationOptions(cancelRequestMutationOptions)
	);
	const cancelRequest = React.useCallback(
		() => cancelRequestMutation.mutate({ userId: user.id }),
		[cancelRequestMutation, user.id]
	);

	const unlinkMutation = trpc.useMutation(
		"users.unlink",
		useTrpcMutationOptions(unlinkMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
	);
	const unlinkUser = React.useCallback(
		() => unlinkMutation.mutate({ id: user.id }),
		[unlinkMutation, user.id]
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
				{user.publicName ? (
					<Text>Public name: {user.publicName}</Text>
				) : (
					<Text>Add public name</Text>
				)}
			</ReactNative.TouchableOpacity>

			{user.email ? (
				<>
					<Text>Connected with email: {user.email}</Text>
					<Button title="Unlink email" onPress={unlinkUser} />
				</>
			) : hasOutboundConnectionIntention === false ? (
				<ReactNative.TouchableOpacity>
					<Button title="Connect" onPress={promptConnect} />
				</ReactNative.TouchableOpacity>
			) : hasOutboundConnectionIntention === undefined ? (
				<Text>Loading connection intentions..</Text>
			) : (
				<Button title="Cancel request" onPress={cancelRequest} />
			)}
			<RemoveButton onPress={deleteUser} disabled={user.dirty}>
				Remove user
			</RemoveButton>
			<MutationWrapper<"users.delete"> mutation={deleteUserMutation}>
				{() => <Text>Remove success!</Text>}
			</MutationWrapper>
			<MutationWrapper<"users.update"> mutation={updateUserMutation}>
				{() => <Text>Update success!</Text>}
			</MutationWrapper>
			<MutationWrapper<"account-connection-intentions.put">
				mutation={connectUserMutation}
			>
				{() => <Text>Connect intention sent successfully!</Text>}
			</MutationWrapper>
			<MutationWrapper<"account-connection-intentions.cancel-request">
				mutation={cancelRequestMutation}
			>
				{() => <Text>Connect intention canceled successfully!</Text>}
			</MutationWrapper>
		</Block>
	);
};
