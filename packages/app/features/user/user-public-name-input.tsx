import React from "react";

import { Button } from "@nextui-org/react";
import { IoTrashBin as TrashBin } from "react-icons/io5";

import { Input } from "app/components/base/input";
import { useBooleanState } from "app/hooks/use-boolean-state";
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

export const UserPublicNameInput: React.FC<Props> = ({ user, isLoading }) => {
	const [showInput, { setTrue: setInput, setFalse: unsetInput }] =
		useBooleanState(user.publicName !== undefined);
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
		useTrpcMutationOptions(mutations.users.update.options),
	);
	const savePublicName = React.useCallback(
		(nextName: string | undefined) => {
			if (nextName === undefined && user.publicName === undefined) {
				unsetInput();
				return;
			}
			updateUserMutation.mutate(
				{
					id: user.id,
					update: { type: "publicName", publicName: nextName },
				},
				{
					onSuccess: () => {
						setValue(nextName ?? "");
						if (nextName === undefined) {
							unsetInput();
						}
					},
				},
			);
		},
		[updateUserMutation, user.id, setValue, unsetInput, user.publicName],
	);

	if (!showInput) {
		return (
			<Button
				color="primary"
				isDisabled={updateUserMutation.isPending || isLoading}
				onClick={setInput}
			>
				Add public name
			</Button>
		);
	}

	return (
		<Input
			{...bindings}
			label="Public user name"
			mutation={updateUserMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save user public name",
				isHidden: user.publicName === getValue(),
				onClick: () => savePublicName(getValue()),
			}}
			endContent={
				user.publicName === undefined ? null : (
					<Button
						title="Remove user public name"
						variant="light"
						isLoading={updateUserMutation.isPending}
						onClick={() => savePublicName(undefined)}
						color="danger"
						isIconOnly
					>
						<TrashBin size={24} />
					</Button>
				)
			}
		/>
	);
};
