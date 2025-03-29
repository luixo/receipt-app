import type React from "react";
import { View } from "react-native";

import { z } from "zod";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { priceSchema, priceSchemaDecimal } from "~app/utils/validation";
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

	const form = useAppForm({
		defaultValues: { value: item.price },
		validators: { onChange: z.object({ value: priceSchema }) },
		onSubmit: ({ value }) => {
			if (value.value === item.price) {
				unsetEditing();
				return;
			}
			updateItemPrice(item.id, value.value, { onSuccess: unsetEditing });
		},
	});

	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update,
		(vars) => vars.update.type === "price" && vars.id === item.id,
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
		<form.AppField name="value">
			{(field) => (
				<field.NumberField
					value={field.state.value}
					onValueChange={field.setValue}
					name={field.name}
					onBlur={field.handleBlur}
					fieldError={field.state.meta.errors}
					step={10 ** -priceSchemaDecimal}
					aria-label="Receipt item price"
					className="basis-24"
					labelPlacement="outside-left"
					mutation={updateMutationState}
					isDisabled={isDisabled}
					saveProps={{
						title: "Save receipt item price",
						onPress: () => {
							void field.form.handleSubmit();
						},
					}}
					variant="bordered"
				/>
			)}
		</form.AppField>
	);
};
