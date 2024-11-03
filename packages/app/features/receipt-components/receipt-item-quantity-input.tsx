import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { quantitySchema } from "~app/utils/validation";
import { Input } from "~components/input";
import { Text } from "~components/text";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";

import { useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import type { Item } from "./state";

type Props = {
	item: Item;
	isDisabled: boolean;
};

export const ReceiptItemQuantityInput: React.FC<Props> = ({
	item,
	isDisabled: isExternalDisabled,
}) => {
	const { receiptDisabled, receiptId } = useReceiptContext();
	const canEdit = useCanEdit();
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
			context: receiptId,
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
	const isDisabled = !canEdit || receiptDisabled || isExternalDisabled;

	if (!isEditing) {
		return (
			<View
				className={`${
					isDisabled ? undefined : "cursor-pointer"
				} flex-row items-center gap-1`}
				onClick={isDisabled ? undefined : switchEditing}
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
			isDisabled={isDisabled}
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
