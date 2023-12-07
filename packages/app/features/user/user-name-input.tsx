import React from "react";

import { Button, Input } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { userNameSchema } from "app/utils/validation";

type Props = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
};

export const UserNameInput: React.FC<Props> = ({ user, isLoading }) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: user.name,
		schema: userNameSchema,
	});

	const updateUserMutation = trpc.users.update.useMutation(
		useTrpcMutationOptions(mutations.users.update.options),
	);
	const saveName = React.useCallback(
		(nextName: string) => {
			updateUserMutation.mutate(
				{ id: user.remoteId, update: { type: "name", name: nextName } },
				{ onSuccess: () => setValue(nextName) },
			);
		},
		[updateUserMutation, user.remoteId, setValue],
	);
	const isNameSync = user.name === getValue();

	return (
		<Input
			{...bindings}
			label="User name"
			labelPlacement="outside"
			isDisabled={updateUserMutation.isLoading || isLoading}
			isInvalid={Boolean(inputState.error || updateUserMutation.error)}
			errorMessage={
				inputState.error?.message || updateUserMutation.error?.message
			}
			endContent={
				<Button
					title="Save user name"
					variant="light"
					isLoading={updateUserMutation.isLoading}
					isDisabled={Boolean(inputState.error) || isNameSync}
					color={isNameSync ? "success" : "warning"}
					onClick={() => saveName(getValue())}
					isIconOnly
				>
					<CheckMark size={24} />
				</Button>
			}
		/>
	);
};
