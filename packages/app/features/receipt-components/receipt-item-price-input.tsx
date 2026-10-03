import type React from "react";

import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { formatCurrency, getCurrencySymbol } from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { priceSchema, priceSchemaDecimal } from "~app/utils/validation";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import type { Item } from "./state";

type Props = {
	item: Item;
	isDisabled: boolean;
	className?: string;
};

export const ReceiptItemPriceInput: React.FC<Props> = ({
	item,
	isDisabled: isExternalDisabled,
	className = "",
}) => {
	const { t } = useTranslation("receipts");
	const { currencyCode, receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
	const { updateItemPrice } = useActionsHooksContext();

	const form = useAppForm({
		defaultValues: { value: item.price },
		validators: { onChange: z.object({ value: priceSchema }) },
		onSubmit: ({ value }) => {
			if (value.value === item.price) {
				return;
			}
			updateItemPrice(item.id, value.value);
		},
	});

	const trpc = useTRPC();
	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update.mutationKey(),
		(vars) => vars.update.type === "price" && vars.id === item.id,
	);
	const locale = useLocale();
	const isDisabled = isExternalDisabled || receiptDisabled;

	if (!canEdit) {
		return (
			<View className="flex-row items-center gap-1">
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
					variant="secondary"
					name={field.name}
					onBlur={() => {
						field.handleBlur();
						if (!isDisabled && updateMutationState?.status !== "pending") {
							void field.form.handleSubmit();
						}
					}}
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					fractionDigits={priceSchemaDecimal}
					aria-label={t("item.form.price.label")}
					className={cn("shrink-0 basis-40", className)}
					mutation={updateMutationState}
					isDisabled={isDisabled}
					endContent={
						<>
							{updateMutationState?.status === "pending" ? (
								<Spinner size="sm" />
							) : null}
							<Text>{getCurrencySymbol(locale, currencyCode)}</Text>
						</>
					}
				/>
			)}
		</form.AppField>
	);
};
