import type React from "react";
import { View } from "react-native";

import { z } from "zod/v4";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
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

	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update,
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
				<Text>x {item.quantity} unit</Text>
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
					step={10 ** -quantitySchemaDecimal}
					formatOptions={{ maximumFractionDigits: quantitySchemaDecimal }}
					aria-label="Receipt item quantity"
					mutation={updateMutationState}
					isDisabled={isDisabled}
					className="basis-24"
					labelPlacement="outside-left"
					variant="bordered"
					endContent={
						<form.Subscribe selector={(state) => state.canSubmit}>
							{(canSubmit) => (
								<SaveButton
									title="Save receipt item quantity"
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
