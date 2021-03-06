import React from "react";

import { Input, Text, styled, Spacer } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { parseNumberWithDecimals, quantitySchema } from "app/utils/validation";
import { ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

const Wrapper = styled("div", { display: "flex", alignItems: "center" });

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	role: Role;
	isLoading: boolean;
};

export const ReceiptItemQuantityInput: React.FC<Props> = ({
	receiptId,
	receiptItem,
	isLoading,
	role,
}) => {
	const [isEditing, { switchValue: switchEditing }] = useBooleanState();

	const {
		bindings,
		state: inputState,
		getValue,
	} = useSingleInput({
		initialValue: receiptItem.quantity,
		schema: quantitySchema,
	});

	const updateMutation = trpc.useMutation(
		"receipt-items.update",
		useTrpcMutationOptions(cache.receiptItems.update.mutationOptions, receiptId)
	);
	const updateQuantity = React.useCallback(
		(quantity: number) => {
			switchEditing();
			if (quantity === receiptItem.quantity) {
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "quantity", quantity },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.quantity, switchEditing]
	);

	const onChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const parsedNumber = parseNumberWithDecimals(e.currentTarget.value);
			if (parsedNumber === undefined) {
				return;
			}
			bindings.onChange(parsedNumber);
		},
		[bindings]
	);

	if (!isEditing) {
		return (
			<Wrapper>
				<Spacer x={0.5} />
				<Text>x {receiptItem.quantity} unit</Text>
				{role !== "viewer" ? (
					<IconButton
						auto
						light
						onClick={switchEditing}
						disabled={isLoading}
						css={{ p: 0, mx: "$4" }}
					>
						<EditIcon size={24} />
					</IconButton>
				) : (
					<Spacer x={0.25} />
				)}
			</Wrapper>
		);
	}

	return (
		<Input
			{...bindings}
			onChange={onChange}
			disabled={updateMutation.isLoading || isLoading}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={inputState.error?.message || updateMutation.error?.message}
			contentRightStyling={updateMutation.isLoading}
			contentRight={
				<IconButton
					title="Save receipt item quantity"
					light
					isLoading={updateMutation.isLoading}
					disabled={Boolean(inputState.error)}
					onClick={() => updateQuantity(getValue())}
					icon={<CheckMark size={24} />}
				/>
			}
			bordered
			width="$24"
		/>
	);
};
