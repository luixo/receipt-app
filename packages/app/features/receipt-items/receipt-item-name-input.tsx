import React from "react";
import { View } from "react-native";

import { Button } from "@nextui-org/react";
import { MdEdit as EditIcon } from "react-icons/md";

import { Input } from "app/components/base/input";
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

	return (
		<Input
			{...bindings}
			aria-label="Receipt item name"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save receipt item name",
				isHidden: receiptItem.name === getValue(),
				onClick: () => updateName(getValue()),
			}}
		/>
	);
};
