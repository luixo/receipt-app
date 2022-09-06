import React from "react";

import { Input } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { userNameSchema } from "app/utils/validation";
import { UsersId } from "next-app/db/models";

type Props = {
	account: TRPCQueryOutput<"account.get">;
};

export const AccountNameInput: React.FC<Props> = ({ account }) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: account.name,
		schema: userNameSchema,
	});

	const updateUserMutation = trpc.users.update.useMutation(
		useTrpcMutationOptions(cache.users.update.mutationOptions)
	);
	const saveName = useAsyncCallback(
		async (isMount, nextName: string) => {
			if (nextName === account.name) {
				return;
			}
			await updateUserMutation.mutateAsync({
				// Typesystem doesn't know that we use account id as self user id
				id: account.id as UsersId,
				update: { type: "name", name: nextName },
			});
			if (!isMount()) {
				return;
			}
			setValue(nextName);
		},
		[updateUserMutation, account.id, account.name, setValue]
	);

	return (
		<Input
			{...bindings}
			label="User name"
			disabled={updateUserMutation.isLoading}
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
					disabled={Boolean(inputState.error)}
					onClick={() => saveName(getValue())}
					icon={<CheckMark size={24} />}
				/>
			}
		/>
	);
};
