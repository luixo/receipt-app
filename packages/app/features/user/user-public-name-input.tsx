import React from "react";
import * as ReactNative from "react-native";

import { Button, Input, Spacer } from "@nextui-org/react";
import {
	IoCheckmarkCircleOutline as CheckMark,
	IoTrashBin as TrashBin,
} from "react-icons/io5";

import { IconButton } from "app/components/icon-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersGetInput } from "app/utils/queries/users-get";
import { usersGetPagedInputStore } from "app/utils/queries/users-get-paged";
import { styled } from "app/utils/styles";
import { userNameSchema } from "app/utils/validation";

import { updateMutationOptions } from "./update-mutation-options";

const ButtonsContainer = styled(ReactNative.View)({
	display: "flex",
	flexDirection: "row",
});

type Props = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
	input: UsersGetInput;
};

export const UserPublicNameInput: React.FC<Props> = ({
	user,
	isLoading,
	input,
}) => {
	const [showInput, setShowInput] = React.useState(user.publicName !== null);
	const switchShowInput = React.useCallback(
		() => setShowInput((prev) => !prev),
		[setShowInput]
	);
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: user.publicName ?? "",
		schema: userNameSchema,
	});

	const usersGetPagedInput = usersGetPagedInputStore();
	const updateUserMutation = trpc.useMutation(
		"users.update",
		useTrpcMutationOptions(updateMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
	);
	const savePublicName = useAsyncCallback(
		async (isMount, nextName: string | null) => {
			await updateUserMutation.mutateAsync({
				id: user.id,
				update: { type: "publicName", publicName: nextName },
			});
			if (!isMount()) {
				return;
			}
			setValue(nextName ?? "");
		},
		[updateUserMutation, user.id]
	);

	if (!showInput) {
		return (
			<>
				<Spacer y={1} />
				<Button
					disabled={updateUserMutation.isLoading || isLoading}
					onClick={switchShowInput}
				>
					Add public name
				</Button>
			</>
		);
	}

	return (
		<>
			<Spacer y={1} />
			<Input
				{...bindings}
				label="Public user name"
				disabled={updateUserMutation.isLoading || isLoading}
				status={inputState.error ? "warning" : undefined}
				helperColor={inputState.error ? "warning" : "error"}
				helperText={
					inputState.error?.message || updateUserMutation.error?.message
				}
				contentRightStyling={updateUserMutation.isLoading}
				contentRight={
					<ButtonsContainer>
						<IconButton
							title="Save user public name"
							light
							isLoading={updateUserMutation.isLoading}
							disabled={
								user.publicName === getValue() || Boolean(inputState.error)
							}
							onClick={() => savePublicName(getValue())}
							icon={<CheckMark size={24} />}
						/>
						<IconButton
							title="Remove user public name"
							light
							isLoading={updateUserMutation.isLoading}
							onClick={
								user.publicName ? () => savePublicName(null) : switchShowInput
							}
							color="error"
							icon={<TrashBin size={24} />}
						/>
					</ButtonsContainer>
				}
			/>
		</>
	);
};
