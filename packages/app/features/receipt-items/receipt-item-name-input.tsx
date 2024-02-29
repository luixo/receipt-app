import React from "react";
import { View } from "react-native";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { receiptItemNameSchema } from "~app/utils/validation";
import { Input, Text } from "~components";
import * as mutations from "~mutations";
import type { ReceiptsId } from "~web/db/models";

type ReceiptItem = TRPCQueryOutput<"receipts.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemNameInput: React.FC<Props> = ({
	receiptId,
	receiptItem,
	isLoading,
	readOnly,
}) => {
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const {
		bindings,
		state: inputState,
		getValue,
	} = useSingleInput({
		initialValue: receiptItem.name,
		schema: receiptItemNameSchema,
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(mutations.receiptItems.update.options, {
			context: receiptId,
			onSuccess: switchEditing,
		}),
	);
	const updateName = React.useCallback(
		(name: string) => {
			if (name === receiptItem.name) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "name", name },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.name, unsetEditing],
	);
	const disabled = readOnly || isLoading;

	if (!isEditing) {
		return (
			<View
				className={`${
					disabled ? undefined : "cursor-pointer"
				} flex-row items-center gap-1`}
				onClick={disabled ? undefined : switchEditing}
			>
				<Text className="text-xl">{receiptItem.name}</Text>
			</View>
		);
	}

	return (
		<Input
			{...bindings}
			aria-label="Receipt item name"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			className="basis-52"
			saveProps={{
				title: "Save receipt item name",
				onClick: () => updateName(getValue()),
			}}
		/>
	);
};
