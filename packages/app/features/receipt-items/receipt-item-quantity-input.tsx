import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { quantitySchema } from "~app/utils/validation";
import { Input, Text } from "~components";
import type { ReceiptsId } from "~db/models";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemQuantityInput: React.FC<Props> = ({
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
		getNumberValue,
	} = useSingleInput({
		initialValue: receiptItem.quantity,
		schema: quantitySchema,
		type: "number",
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receiptId,
			onSuccess: unsetEditing,
		}),
	);
	const updateQuantity = React.useCallback(
		(quantity: number) => {
			if (quantity === receiptItem.quantity) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "quantity", quantity },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.quantity, unsetEditing],
	);
	const disabled = readOnly || isLoading;

	if (!isEditing) {
		return (
			<View
				className={`${
					disabled ? undefined : "cursor-pointer"
				} flex-row items-center gap-1`}
				onClick={disabled ? undefined : switchEditing}
			>
				<Text>x {receiptItem.quantity} unit</Text>
			</View>
		);
	}

	return (
		<Input
			{...bindings}
			aria-label="Receipt item quantity"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			className="basis-24"
			labelPlacement="outside-left"
			saveProps={{
				title: "Save receipt item quantity",
				onClick: () => updateQuantity(getNumberValue()),
			}}
			variant="bordered"
		/>
	);
};
