import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { priceSchema } from "~app/utils/validation";
import { Input, Text } from "~components";
import type { ReceiptsId } from "~db/models";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	readOnly?: boolean;
	currencyCode?: CurrencyCode;
	isLoading: boolean;
};

export const ReceiptItemPriceInput: React.FC<Props> = ({
	receiptId,
	receiptItem,
	isLoading,
	currencyCode,
	readOnly,
}) => {
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const {
		bindings,
		state: inputState,
		getNumberValue,
	} = useSingleInput({
		initialValue: receiptItem.price,
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
			if (price === receiptItem.price) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "price", price },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.price, unsetEditing],
	);
	const currency = useFormattedCurrency(currencyCode);

	if (!isEditing) {
		return (
			<View
				className="cursor-pointer flex-row items-center gap-1"
				onClick={readOnly || isLoading ? undefined : switchEditing}
			>
				<Text>
					{receiptItem.price} {currency}
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
