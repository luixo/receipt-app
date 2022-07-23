import React from "react";
import * as ReactNative from "react-native";

import { Button, Loading, Spacer } from "@nextui-org/react";
import { IoTrashBin as TrashBin } from "react-icons/io5";
import { useRouter } from "solito/router";

import { cache, Cache } from "app/cache";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { styled, Text } from "app/utils/styles";

import { deleteMutationOptions } from "./delete-mutation-options";

const RemoveButtons = styled(ReactNative.View)({
	marginTop: "sm",
	flexDirection: "row",
});

type Props = {
	user: TRPCQueryOutput<"users.get">;
	input: Cache.Users.Get.Input;
	setLoading: (nextLoading: boolean) => void;
};

export const UserRemoveButton: React.FC<Props> = ({
	user,
	input,
	setLoading,
}) => {
	const usersGetPagedInput = cache.users.getPaged.useStore();
	const router = useRouter();
	const deleteUserMutation = trpc.useMutation(
		"users.delete",
		useTrpcMutationOptions(deleteMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
	);
	React.useEffect(
		() => setLoading(deleteUserMutation.isLoading),
		[deleteUserMutation.isLoading, setLoading]
	);
	const [showDeleteConfirmation, setShowDeleteConfimation] =
		React.useState(false);
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

	if (!showDeleteConfirmation) {
		return (
			<>
				<Spacer y={1} />
				<Button
					auto
					onClick={() => setShowDeleteConfimation(true)}
					color="error"
				>
					<TrashBin size={24} />
					<Spacer x={0.5} />
					Remove user
				</Button>
			</>
		);
	}

	return (
		<>
			<Spacer y={1} />
			<Text>Are you sure?</Text>
			<RemoveButtons>
				<Button
					auto
					onClick={deleteUser}
					disabled={deleteUserMutation.isLoading}
					color="error"
				>
					{deleteUserMutation.isLoading ? (
						<Loading color="currentColor" size="sm" />
					) : (
						"Yes"
					)}
				</Button>
				<Spacer x={0.5} />
				<Button
					auto
					onClick={() => setShowDeleteConfimation(false)}
					disabled={deleteUserMutation.isLoading}
				>
					No
				</Button>
			</RemoveButtons>
			{deleteUserMutation.error ? (
				<Button color="error" onClick={() => deleteUserMutation.reset()}>
					{deleteUserMutation.error.message}
				</Button>
			) : null}
		</>
	);
};
