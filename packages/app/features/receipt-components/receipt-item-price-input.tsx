import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { priceSchema } from "~app/utils/validation";
import { Input } from "~components/input";
import { Text } from "~components/text";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import type { Item } from "./state";

type Props = {
	item: Item;
	isDisabled: boolean;
};

export const ReceiptItemPriceInput: React.FC<Props> = ({
	item,
	isDisabled: isExternalDisabled,
}) => {
	const { currencyCode, receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
	const { updateItemPrice } = useActionsHooksContext();
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const {
		bindings,
		state: inputState,
		getNumberValue,
	} = useSingleInput({
		initialValue: item.price,
		schema: priceSchema,
		type: "number",
	});

	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update,
		(vars) => vars.update.type === "price" && vars.id === item.id,
	);
	const updatePrice = React.useCallback(
		(price: number) => {
			if (price === item.price) {
				unsetEditing();
				return;
			}
			updateItemPrice(item.id, price, { onSuccess: unsetEditing });
		},
		[item.id, item.price, unsetEditing, updateItemPrice],
	);
	const currency = useFormattedCurrency(currencyCode);
	const isDisabled = !canEdit || isExternalDisabled || receiptDisabled;

	if (!isEditing) {
		return (
			<View
				className={`${
					isDisabled ? undefined : "cursor-pointer"
				} flex-row items-center gap-1`}
				onClick={isDisabled ? undefined : switchEditing}
			>
				<Text>
					{item.price} {currency.symbol}
				</Text>
			</View>
		);
	}

	return (
		<Input
			{...bindings}
			aria-label="Receipt item price"
			className="basis-24"
			labelPlacement="outside-left"
			mutation={updateMutationState}
			fieldError={inputState.error}
			isDisabled={isDisabled}
			saveProps={{
				title: "Save receipt item price",
				onPress: () => updatePrice(getNumberValue()),
			}}
			variant="bordered"
		/>
	);
};
