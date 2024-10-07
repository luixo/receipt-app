import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { quantitySchema } from "~app/utils/validation";
import { Input } from "~components/input";
import { Text } from "~components/text";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];

type Props = {
	item: ReceiptItem;
	receipt: TRPCQueryOutput<"receipts.get">;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemQuantityInput: React.FC<Props> = ({
	item,
	receipt,
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
		initialValue: item.quantity,
		schema: quantitySchema,
		type: "number",
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receipt.id,
			onSuccess: unsetEditing,
		}),
	);
	const updateQuantity = React.useCallback(
		(quantity: number) => {
			if (quantity === item.quantity) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: item.id,
				update: { type: "quantity", quantity },
			});
		},
		[updateMutation, item.id, item.quantity, unsetEditing],
	);
	const disabled = readOnly || Boolean(receipt.lockedTimestamp) || isLoading;

	if (!isEditing) {
		return (
			<View
				className={`${
					disabled ? undefined : "cursor-pointer"
				} flex-row items-center gap-1`}
				onClick={disabled ? undefined : switchEditing}
			>
				<Text>x {item.quantity} unit</Text>
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
