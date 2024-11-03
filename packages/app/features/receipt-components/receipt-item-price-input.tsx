import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { priceSchema } from "~app/utils/validation";
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

export const ReceiptItemPriceInput: React.FC<Props> = ({
	item,
	isDisabled: isExternalDisabled,
}) => {
	const { receiptId, currencyCode, receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
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

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receiptId,
			onSuccess: unsetEditing,
		}),
	);
	const updatePrice = React.useCallback(
		(price: number) => {
			if (price === item.price) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: item.id,
				update: { type: "price", price },
			});
		},
		[updateMutation, item.id, item.price, unsetEditing],
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
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isDisabled}
			saveProps={{
				title: "Save receipt item price",
				onClick: () => updatePrice(getNumberValue()),
			}}
			variant="bordered"
		/>
	);
};
