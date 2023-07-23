import React from "react";

import { Input } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { IconButton } from "app/components/icon-button";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";
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
					light
					isLoading={updateUserMutation.isLoading}
					disabled={user.name === getValue() || Boolean(inputState.error)}
					onClick={() => saveName(getValue())}
					icon={<CheckMark size={24} />}
				/>
			}
		/>
	);
};
