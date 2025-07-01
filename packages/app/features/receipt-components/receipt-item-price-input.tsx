import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { formatCurrency } from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { priceSchema, priceSchemaDecimal } from "~app/utils/validation";
import { SaveButton } from "~components/save-button";
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
	const { t } = useTranslation("receipts");
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

	const trpc = useTRPC();
	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update.mutationKey(),
		(vars) => vars.update.type === "price" && vars.id === item.id,
	);
	const locale = useLocale();
	const isDisabled = !canEdit || isExternalDisabled || receiptDisabled;

	if (!isEditing) {
		return (
			<View
				className={`${
					isDisabled ? undefined : "cursor-pointer"
				} flex-row items-center gap-1`}
				onClick={isDisabled ? undefined : switchEditing}
			>
				<Text>{formatCurrency(locale, currencyCode, item.price)}</Text>
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
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					step={10 ** -priceSchemaDecimal}
					formatOptions={{ maximumFractionDigits: priceSchemaDecimal }}
					aria-label={t("item.form.price.label")}
					className="basis-24"
					labelPlacement="outside-left"
					mutation={updateMutationState}
					isDisabled={isDisabled}
					variant="bordered"
					endContent={
						<form.Subscribe selector={(state) => state.canSubmit}>
							{(canSubmit) => (
								<SaveButton
									title={t("item.form.price.saveButton")}
									onPress={() => {
										void field.form.handleSubmit();
									}}
									isLoading={updateMutationState?.status === "pending"}
									isDisabled={isDisabled || !canSubmit}
								/>
							)}
						</form.Subscribe>
					}
				/>
			)}
		</form.AppField>
	);
};
