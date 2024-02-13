import React from "react";

import { Input } from "app/components/base/input";
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
				{ id: user.id, update: { type: "name", name: nextName } },
				{ onSuccess: () => setValue(nextName) },
			);
		},
		[updateUserMutation, user.id, setValue],
	);

	return (
		<Input
			{...bindings}
			label="User name"
			mutation={updateUserMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save user name",
				isHidden: user.name === getValue(),
				onClick: () => saveName(getValue()),
			}}
		/>
	);
};
