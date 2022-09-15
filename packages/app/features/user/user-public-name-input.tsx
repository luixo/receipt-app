import React from "react";

import { styled, Button, Input } from "@nextui-org/react";
import {
	IoCheckmarkCircleOutline as CheckMark,
	IoTrashBin as TrashBin,
} from "react-icons/io5";

import { IconButton } from "app/components/icon-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { userNameSchema } from "app/utils/validation";

const ButtonsContainer = styled("div", {
	display: "flex",
});

type Props = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
};

export const UserPublicNameInput: React.FC<Props> = ({ user, isLoading }) => {
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

	const updateUserMutation = trpc.users.update.useMutation(
		useTrpcMutationOptions(mutations.users.update.options)
	);
	const savePublicName = useAsyncCallback(
		async (isMount, nextName: string | null) => {
			await updateUserMutation.mutateAsync({
				id: user.remoteId,
				update: { type: "publicName", publicName: nextName },
			});
			if (!isMount()) {
				return;
			}
			setValue(nextName ?? "");
		},
		[updateUserMutation, user.remoteId, setValue]
	);

	if (!showInput) {
		return (
			<Button
				disabled={updateUserMutation.isLoading || isLoading}
				onClick={switchShowInput}
			>
				Add public name
			</Button>
		);
	}

	return (
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
	);
};
