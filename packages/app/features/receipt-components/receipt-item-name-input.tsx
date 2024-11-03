import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { receiptItemNameSchema } from "~app/utils/validation";
import { Input } from "~components/input";
import { Text } from "~components/text";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";

import { useReceiptContext } from "./context";
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
	const { receiptId, receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const {
		bindings,
		state: inputState,
		getValue,
	} = useSingleInput({
		initialValue: item.name,
		schema: receiptItemNameSchema,
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receiptId,
			onSuccess: switchEditing,
		}),
	);
	const updateName = React.useCallback(
		(name: string) => {
			if (name === item.name) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: item.id,
				update: { type: "name", name },
			});
		},
		[updateMutation, item.id, item.name, unsetEditing],
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
		<Input
			{...bindings}
			aria-label="Receipt item name"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isDisabled}
			className="basis-52"
			saveProps={{
				title: "Save receipt item name",
				onClick: () => updateName(getValue()),
			}}
		/>
	);
};
