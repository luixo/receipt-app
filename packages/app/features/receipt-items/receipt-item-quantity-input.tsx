import React from "react";

import { Input, Spacer, Text, styled } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

import { useBooleanState } from "app/hooks/use-boolean-state";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { quantitySchema } from "app/utils/validation";
import type { ReceiptsId } from "next-app/db/models";

const Wrapper = styled("div", { display: "flex", alignItems: "center" });

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
			<Wrapper>
				<Spacer x={0.5} />
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
				) : (
					<Spacer x={0.25} />
				)}
			</Wrapper>
		);
	}

	const isQuantitySync = receiptItem.quantity === getNumberValue();

	return (
		<Input
			{...bindings}
			aria-label="Receipt item quantity"
			disabled={updateMutation.isLoading || isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={inputState.error?.message || updateMutation.error?.message}
			contentRightStyling={false}
			contentRight={
				<Button
					title="Save receipt item quantity"
					variant="light"
					isLoading={updateMutation.isLoading}
					color={isQuantitySync ? "success" : "warning"}
					isDisabled={Boolean(inputState.error)}
					onClick={() => updateQuantity(getNumberValue())}
					isIconOnly
				>
					<CheckMark size={24} />
				</Button>
			}
			bordered
			width="$24"
		/>
	);
};
