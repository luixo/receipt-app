import type React from "react";

import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { receiptItemNameSchema } from "~app/utils/validation";
import { SaveButton } from "~components/save-button";
import { Text } from "~components/text";
import { View } from "~components/view";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import type { Item } from "./state";

type Props = {
	item: Item;
	isDisabled: boolean;
};

export const ReceiptItemNameInput: React.FC<Props> = ({
	item,
	isDisabled: isExternalDisabled,
}) => {
	const { t } = useTranslation("receipts");
	const { receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
	const { updateItemName } = useActionsHooksContext();
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const form = useAppForm({
		defaultValues: { value: item.name },
		validators: { onChange: z.object({ value: receiptItemNameSchema }) },
		onSubmit: ({ value }) => {
			if (value.value === item.name) {
				unsetEditing();
				return;
			}
			updateItemName(item.id, value.value, { onSuccess: switchEditing });
		},
	});

	const trpc = useTRPC();
	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update.mutationKey(),
		(vars) => vars.update.type === "name" && vars.id === item.id,
	);
	const isDisabled = !canEdit || receiptDisabled || isExternalDisabled;

	if (!isEditing) {
		return (
			<View
				onPress={isDisabled ? undefined : switchEditing}
				className="flex-row items-center gap-1"
			>
				<Text className="text-xl">{item.name}</Text>
			</View>
		);
	}

	return (
		<form.AppField name="value">
			{(field) => (
				<field.TextField
					value={field.state.value}
					onValueChange={field.setValue}
					name={field.name}
					onBlur={field.handleBlur}
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					aria-label={t("item.form.name.label")}
					mutation={updateMutationState}
					isDisabled={isDisabled}
					className="basis-52"
					endContent={
						<form.Subscribe selector={(state) => state.canSubmit}>
							{(canSubmit) => (
								<SaveButton
									title={t("item.form.name.saveButton")}
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
