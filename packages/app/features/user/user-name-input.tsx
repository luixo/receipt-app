import React from "react";

import { Input } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { IconButton } from "app/components/icon-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useInput } from "app/hooks/use-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersGetInput } from "app/utils/queries/users-get";
import { usersGetPagedInputStore } from "app/utils/queries/users-get-paged";
import { VALIDATIONS_CONSTANTS } from "app/utils/validation";

import { updateMutationOptions } from "./update-mutation-options";

type Props = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
	input: UsersGetInput;
};

export const UserNameInput: React.FC<Props> = ({ user, isLoading, input }) => {
	const {
		bindings,
		state: inputState,
		value: inputValue,
		setValue,
	} = useInput({
		initialValue: user.name,
		rules: {
			minLength: {
				value: VALIDATIONS_CONSTANTS.userName.min,
				message: `User name should be at least ${VALIDATIONS_CONSTANTS.userName.min} symbols`,
			},
			maxLength: {
				value: VALIDATIONS_CONSTANTS.userName.max,
				message: `User name should be at max ${VALIDATIONS_CONSTANTS.userName.max} symbols`,
			},
		},
	});

	const usersGetPagedInput = usersGetPagedInputStore();
	const updateUserMutation = trpc.useMutation(
		"users.update",
		useTrpcMutationOptions(updateMutationOptions, {
			pagedInput: usersGetPagedInput,
			input,
		})
	);
	const saveName = useAsyncCallback(
		async (isMount, nextName: string) => {
			await updateUserMutation.mutateAsync({
				id: user.id,
				update: { type: "name", name: nextName },
			});
			if (!isMount()) {
				return;
			}
			setValue(nextName);
		},
		[updateUserMutation, user.id]
	);

	return (
		<Input
			{...bindings}
			label="User name"
			disabled={updateUserMutation.isLoading || isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={
				inputState.error?.message || updateUserMutation.error?.message
			}
			contentRightStyling={updateUserMutation.isLoading}
			contentRight={
				<IconButton
					title="Save user name"
					isLoading={updateUserMutation.isLoading}
					disabled={
						!inputValue || user.name === inputValue || Boolean(inputState.error)
					}
					onClick={() => saveName(inputValue)}
					icon={<CheckMark size={24} />}
				/>
			}
		/>
	);
};
