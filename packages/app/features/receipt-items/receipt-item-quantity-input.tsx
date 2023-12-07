import React from "react";

import { Button } from "@nextui-org/react";
import { MdEdit as EditIcon } from "react-icons/md";

import { Input } from "app/components/base/input";
import { Text } from "app/components/base/text";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { quantitySchema } from "app/utils/validation";
import type { ReceiptsId } from "next-app/db/models";

type ReceiptItem = TRPCQueryOutput<"receiptItems.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	readOnly?: boolean;
	isLoading: boolean;
};

export const ReceiptItemQuantityInput: React.FC<Props> = ({
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
		getNumberValue,
	} = useSingleInput({
		initialValue: receiptItem.quantity,
		schema: quantitySchema,
		type: "number",
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(mutations.receiptItems.update.options, {
			context: receiptId,
			onSuccess: unsetEditing,
		}),
	);
	const updateQuantity = React.useCallback(
		(quantity: number) => {
			if (quantity === receiptItem.quantity) {
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "quantity", quantity },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.quantity, unsetEditing],
	);

	if (!isEditing) {
		return (
			<>
				<Text>x {receiptItem.quantity} unit</Text>
				{!readOnly ? (
					<Button
						variant="light"
						onClick={switchEditing}
						isDisabled={isLoading}
						className="mx-1"
						isIconOnly
					>
						<EditIcon size={20} />
					</Button>
				) : null}
			</>
		);
	}

	return (
		<Input
			{...bindings}
			aria-label="Receipt item quantity"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			className="w-28"
			saveProps={{
				title: "Save receipt item quantity",
				isHidden: receiptItem.quantity === getNumberValue(),
				onClick: () => updateQuantity(getNumberValue()),
			}}
			variant="bordered"
		/>
	);
};
