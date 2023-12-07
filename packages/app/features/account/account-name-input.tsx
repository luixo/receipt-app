import React from "react";

import { Input } from "app/components/base/input";
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

	return (
		<Input
			{...bindings}
			label="Your name in the receipts"
			mutation={updateNameMutation}
			fieldError={inputState.error}
			saveProps={{
				title: "Save name",
				isHidden: accountQuery.user.name === getValue(),
				onClick: () => saveName(getValue()),
			}}
		/>
	);
};
