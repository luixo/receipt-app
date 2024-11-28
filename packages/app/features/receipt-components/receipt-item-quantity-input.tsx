import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { quantitySchema } from "~app/utils/validation";
import { Input } from "~components/input";
import { Text } from "~components/text";

import { useActionsHooksContext, useReceiptContext } from "./context";
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
	const { receiptDisabled } = useReceiptContext();
	const { updateItemQuantity } = useActionsHooksContext();
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

	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update,
		(vars) => vars.update.type === "quantity" && vars.id === item.id,
	);
	const updateQuantity = React.useCallback(
		(quantity: number) => {
			if (quantity === item.quantity) {
				unsetEditing();
				return;
			}
			updateItemQuantity(item.id, quantity, { onSuccess: unsetEditing });
		},
		[item.quantity, item.id, updateItemQuantity, unsetEditing],
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
			step="0.01"
			aria-label="Receipt item quantity"
			mutation={updateMutationState}
			fieldError={inputState.error}
			isDisabled={isDisabled}
			className="basis-24"
			labelPlacement="outside-left"
			saveProps={{
				title: "Save receipt item quantity",
				onPress: () => updateQuantity(getNumberValue()),
			}}
			variant="bordered"
		/>
	);
};
