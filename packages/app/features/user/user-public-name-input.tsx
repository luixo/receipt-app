import React from "react";

import { Spacer, styled } from "@nextui-org/react";
import { Button, Input } from "@nextui-org/react-tailwind";
import {
	IoCheckmarkCircleOutline as CheckMark,
	IoTrashBin as TrashBin,
} from "react-icons/io5";

import { useBooleanState } from "app/hooks/use-boolean-state";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { userNameSchema } from "app/utils/validation";

const ButtonsContainer = styled("div", {
	display: "flex",
});

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
					id: user.remoteId,
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
		[updateUserMutation, user.remoteId, setValue, unsetInput, user.publicName],
	);

	if (!showInput) {
		return (
			<Button
				color="primary"
				isDisabled={updateUserMutation.isLoading || isLoading}
				onClick={setInput}
			>
				Add public name
			</Button>
		);
	}

	const isNameSync = user.publicName === getValue();

	return (
		<Input
			{...bindings}
			label="Public user name"
			labelPlacement="outside"
			isDisabled={updateUserMutation.isLoading || isLoading}
			isInvalid={Boolean(inputState.error || updateUserMutation.error)}
			errorMessage={
				inputState.error?.message || updateUserMutation.error?.message
			}
			endContent={
				<ButtonsContainer>
					<Button
						title="Save user public name"
						variant="light"
						isLoading={updateUserMutation.isLoading}
						isDisabled={
							Boolean(inputState.error) || isNameSync || getValue() === ""
						}
						onClick={() => savePublicName(getValue())}
						color={isNameSync ? "success" : "warning"}
						isIconOnly
					>
						<CheckMark size={24} />
					</Button>
					{user.publicName === undefined ? null : (
						<>
							<Spacer x={0.25} />
							<Button
								title="Remove user public name"
								variant="light"
								isLoading={updateUserMutation.isLoading}
								onClick={() => savePublicName(undefined)}
								color="danger"
								isIconOnly
							>
								<TrashBin size={24} />
							</Button>
						</>
					)}
				</ButtonsContainer>
			}
		/>
	);
};
