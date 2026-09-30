import type React from "react";

import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { quantitySchema, quantitySchemaDecimal } from "~app/utils/validation";
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

export const ReceiptItemQuantityInput: React.FC<Props> = ({
	item,
	isDisabled: isExternalDisabled,
	className,
}) => {
	const { t } = useTranslation("receipts");
	const { receiptDisabled } = useReceiptContext();
	const { updateItemQuantity } = useActionsHooksContext();
	const canEdit = useCanEdit();

	const form = useAppForm({
		defaultValues: { value: item.quantity },
		validators: { onChange: z.object({ value: quantitySchema }) },
		onSubmit: ({ value }) => {
			if (value.value === item.quantity) {
				return;
			}
			updateItemQuantity(item.id, value.value);
		},
	});

	const trpc = useTRPC();
	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update.mutationKey(),
		(vars) => vars.update.type === "quantity" && vars.id === item.id,
	);
	const isDisabled = receiptDisabled || isExternalDisabled;

	if (!canEdit) {
		return (
			<View className="flex-row items-center gap-1">
				<Text>{t("item.quantity", { quantity: item.quantity })}</Text>
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

					onBlur={() => {
						field.handleBlur();
						if (!isDisabled && updateMutationState?.status !== "pending") {
							void field.form.handleSubmit();
						}
					}}
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					fractionDigits={quantitySchemaDecimal}
					aria-label={t("item.form.quantity.label")}
					mutation={updateMutationState}
					isDisabled={isDisabled}
					className={cn("shrink-0 basis-40", className)}
					labelPlacement="outside-left"
					endContent={
						<View className="flex-row gap-2">
							{updateMutationState?.status === "pending" ? (
								<Spinner size="sm" />
							) : null}
							<Text>{t("item.quantityPostfix")}</Text>
						</View>
					}
				/>
			)}
		</form.AppField>
	);
};
