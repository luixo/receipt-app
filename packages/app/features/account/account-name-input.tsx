import React from "react";

import { Button, Input } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
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
	const isNameSync = accountQuery.user.name === getValue();

	return (
		<Input
			{...bindings}
			label="Your name in the receipts"
			labelPlacement="outside"
			isDisabled={updateNameMutation.isLoading}
			isInvalid={Boolean(inputState.error)}
			errorMessage={
				inputState.error?.message || updateNameMutation.error?.message
			}
			endContent={
				<Button
					title="Save name"
					variant="light"
					color={isNameSync ? "success" : "warning"}
					isLoading={updateNameMutation.isLoading}
					isDisabled={Boolean(inputState.error) || isNameSync}
					onClick={() => saveName(getValue())}
					isIconOnly
				>
					<CheckMark size={24} />
				</Button>
			}
		/>
	);
};
