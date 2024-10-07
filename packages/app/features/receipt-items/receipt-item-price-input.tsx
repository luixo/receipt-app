import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { priceSchema } from "~app/utils/validation";
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

export const ReceiptItemPriceInput: React.FC<Props> = ({
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
		initialValue: item.price,
		schema: priceSchema,
		type: "number",
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receipt.id,
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
	const currency = useFormattedCurrency(receipt.currencyCode);

	if (!isEditing) {
		return (
			<View
				className="cursor-pointer flex-row items-center gap-1"
				onClick={readOnly || isLoading ? undefined : switchEditing}
			>
				<Text>
					{item.price} {currency}
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
			isDisabled={isLoading}
			saveProps={{
				title: "Save receipt item price",
				onClick: () => updatePrice(getNumberValue()),
			}}
			variant="bordered"
		/>
	);
};
