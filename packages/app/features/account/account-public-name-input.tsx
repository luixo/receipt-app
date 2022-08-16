import React from "react";

import { Button, Input, styled } from "@nextui-org/react";
import {
	IoCheckmarkCircleOutline as CheckMark,
	IoTrashBin as TrashBin,
} from "react-icons/io5";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { userNameSchema } from "app/utils/validation";
import { UsersId } from "next-app/db/models";

const ButtonsContainer = styled("div", {
	display: "flex",
});

type Props = {
	account: TRPCQueryOutput<"account.get">;
};

export const AccountPublicNameInput: React.FC<Props> = ({ account }) => {
	const [showInput, setShowInput] = React.useState(account.publicName !== null);
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
		initialValue: account.publicName ?? "",
		schema: userNameSchema,
	});

	const updateUserMutation = trpc.useMutation(
		"users.update",
		useTrpcMutationOptions(cache.users.update.mutationOptions)
	);
	const savePublicName = useAsyncCallback(
		async (isMount, nextName: string | null) => {
			if (nextName === account.publicName) {
				return;
			}
			await updateUserMutation.mutateAsync({
				// Typesystem doesn't know that we use account id as self user id
				id: account.id as UsersId,
				update: { type: "publicName", publicName: nextName },
			});
			if (!isMount()) {
				return;
			}
			setValue(nextName ?? "");
		},
		[updateUserMutation, account.id, account.publicName, setValue]
	);

	if (!showInput) {
		return (
			<Button disabled={updateUserMutation.isLoading} onClick={switchShowInput}>
				Add public name
			</Button>
		);
	}

	return (
		<Input
			{...bindings}
			label="Public account name"
			placeholder="Shown for other users"
			disabled={updateUserMutation.isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={
				inputState.error?.message || updateUserMutation.error?.message
			}
			contentRightStyling={updateUserMutation.isLoading}
			contentRight={
				<ButtonsContainer>
					<IconButton
						title="Save account public name"
						light
						isLoading={updateUserMutation.isLoading}
						disabled={Boolean(inputState.error)}
						onClick={() => savePublicName(getValue())}
						icon={<CheckMark size={24} />}
					/>
					<IconButton
						title="Remove account public name"
						light
						isLoading={updateUserMutation.isLoading}
						onClick={
							account.publicName ? () => savePublicName(null) : switchShowInput
						}
						color="error"
						icon={<TrashBin size={24} />}
					/>
				</ButtonsContainer>
			}
		/>
	);
};
