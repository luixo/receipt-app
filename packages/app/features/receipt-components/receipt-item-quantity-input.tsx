import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { quantitySchema, quantitySchemaDecimal } from "~app/utils/validation";
import { SaveButton } from "~components/save-button";
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
	const { t } = useTranslation("receipts");
	const { receiptDisabled } = useReceiptContext();
	const { updateItemQuantity } = useActionsHooksContext();
	const canEdit = useCanEdit();
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const form = useAppForm({
		defaultValues: { value: item.quantity },
		validators: { onChange: z.object({ value: quantitySchema }) },
		onSubmit: ({ value }) => {
			if (value.value === item.quantity) {
				unsetEditing();
				return;
			}
			updateItemQuantity(item.id, value.value, { onSuccess: unsetEditing });
		},
	});

	const trpc = useTRPC();
	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update.mutationKey(),
		(vars) => vars.update.type === "quantity" && vars.id === item.id,
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
				<Text>{t("item.quantityPostfix", { quantity: item.quantity })}</Text>
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
					fractionDigits={quantitySchemaDecimal}
					aria-label={t("item.form.quantity.label")}
					mutation={updateMutationState}
					isDisabled={isDisabled}
					className="basis-24"
					labelPlacement="outside-left"
					variant="bordered"
					endContent={
						<form.Subscribe selector={(state) => state.canSubmit}>
							{(canSubmit) => (
								<SaveButton
									title={t("item.form.quantity.saveButton")}
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
