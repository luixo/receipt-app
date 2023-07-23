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
	accountQuery: TRPCQueryOutput<"account.get">;
};

export const AccountNameInput: React.FC<Props> = ({ accountQuery }) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: accountQuery.user.name,
		schema: userNameSchema,
	});

	const updateNameMutation = trpc.account.changeName.useMutation(
		useTrpcMutationOptions(mutations.account.changeName.options, {
			context: { id: accountQuery.account.id },
		}),
	);
	const saveName = React.useCallback(
		(nextName: string) => {
			if (nextName === accountQuery.user.name) {
				return;
			}
			updateNameMutation.mutate(
				{ name: nextName },
				{ onSuccess: () => setValue(nextName) },
			);
		},
		[updateNameMutation, accountQuery.user.name, setValue],
	);

	return (
		<Input
			{...bindings}
			label="Your name in the receipts"
			disabled={updateNameMutation.isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={
				inputState.error?.message || updateNameMutation.error?.message
			}
			contentRightStyling={updateNameMutation.isLoading}
			contentRight={
				<IconButton
					title="Save name"
					light
					isLoading={updateNameMutation.isLoading}
					disabled={Boolean(inputState.error)}
					onClick={() => saveName(getValue())}
					icon={<CheckMark size={24} />}
				/>
			}
		/>
	);
};
