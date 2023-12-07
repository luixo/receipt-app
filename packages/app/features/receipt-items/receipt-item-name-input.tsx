import React from "react";
import { View } from "react-native";

import { Button, Input } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

import { Text } from "app/components/base/text";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { receiptItemNameSchema } from "app/utils/validation";
import type { ReceiptsId } from "next-app/db/models";

type ReceiptItem = TRPCQueryOutput<"receiptItems.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemNameInput: React.FC<Props> = ({
	receiptId,
	receiptItem,
	isLoading,
	readOnly,
}) => {
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const {
		bindings,
		state: inputState,
		getValue,
	} = useSingleInput({
		initialValue: receiptItem.name,
		schema: receiptItemNameSchema,
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(mutations.receiptItems.update.options, {
			context: receiptId,
			onSuccess: switchEditing,
		}),
	);
	const updateName = React.useCallback(
		(name: string) => {
			if (name === receiptItem.name) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "name", name },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.name, unsetEditing],
	);

	if (!isEditing) {
		return (
			<View className="flex-row items-center gap-1">
				<Text className="text-xl">{receiptItem.name}</Text>
				{!readOnly ? (
					<Button
						variant="light"
						onClick={switchEditing}
						isDisabled={isLoading}
						isIconOnly
					>
						<EditIcon size={24} />
					</Button>
				) : null}
			</View>
		);
	}

	const isNameSync = receiptItem.name === getValue();

	return (
		<Input
			{...bindings}
			aria-label="Receipt item name"
			labelPlacement="outside"
			isDisabled={updateMutation.isLoading || isLoading}
			isInvalid={Boolean(inputState.error || updateMutation.error)}
			errorMessage={inputState.error?.message || updateMutation.error?.message}
			endContent={
				<Button
					title="Save receipt item name"
					variant="light"
					isLoading={updateMutation.isLoading}
					color={isNameSync ? "success" : "warning"}
					isDisabled={Boolean(inputState.error)}
					onClick={() => updateName(getValue())}
					isIconOnly
				>
					<CheckMark size={24} />
				</Button>
			}
		/>
	);
};
