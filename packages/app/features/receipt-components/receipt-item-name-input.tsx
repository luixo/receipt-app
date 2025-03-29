import type React from "react";
import { View } from "react-native";

import { z } from "zod";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { receiptItemNameSchema } from "~app/utils/validation";
import { Text } from "~components/text";

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

	const updateMutationState = useTrpcMutationState<"receiptItems.update">(
		trpc.receiptItems.update,
		(vars) => vars.update.type === "name" && vars.id === item.id,
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
					fieldError={field.state.meta.errors}
					aria-label="Receipt item name"
					mutation={updateMutationState}
					isDisabled={isDisabled}
					className="basis-52"
					saveProps={{
						title: "Save receipt item name",
						onPress: () => {
							void field.form.handleSubmit();
						},
					}}
				/>
			)}
		</form.AppField>
	);
};
