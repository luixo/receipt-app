import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { receiptItemNameSchema } from "~app/utils/validation";
import { Input } from "~components/input";
import { Text } from "~components/text";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];

type Props = {
	item: ReceiptItem;
	receipt: TRPCQueryOutput<"receipts.get">;
	readOnly?: boolean;
	isDisabled: boolean;
};

export const ReceiptItemNameInput: React.FC<Props> = ({
	item,
	receipt,
	isDisabled: isExternalDisabled,
	readOnly,
}) => {
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
			context: receipt.id,
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
	const disabled = readOnly || isExternalDisabled;

	if (!isEditing) {
		return (
			<View
				className={`${
					disabled ? undefined : "cursor-pointer"
				} flex-row items-center gap-1`}
				onClick={disabled ? undefined : switchEditing}
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
			isDisabled={isExternalDisabled}
			className="basis-52"
			saveProps={{
				title: "Save receipt item name",
				onClick: () => updateName(getValue()),
			}}
		/>
	);
};
