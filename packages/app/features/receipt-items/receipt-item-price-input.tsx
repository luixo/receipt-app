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
import { Currency } from "app/utils/currency";
import { parseNumberWithDecimals, priceSchema } from "app/utils/validation";
import { ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

const Wrapper = styled("div", { display: "flex", alignItems: "center" });

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	role: Role;
	currency?: Currency;
	isLoading: boolean;
};

export const ReceiptItemPriceInput: React.FC<Props> = ({
	receiptId,
	receiptItem,
	isLoading,
	currency,
	role,
}) => {
	const [isEditing, { switchValue: switchEditing }] = useBooleanState();

	const {
		bindings,
		state: inputState,
		getValue,
	} = useSingleInput({
		initialValue: receiptItem.price,
		schema: priceSchema,
	});

	const updateMutation = trpc.useMutation(
		"receipt-items.update",
		useTrpcMutationOptions(cache.receiptItems.update.mutationOptions, receiptId)
	);
	const updatePrice = React.useCallback(
		(price: number) => {
			switchEditing();
			if (price === receiptItem.price) {
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "price", price },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.price, switchEditing]
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
				<Text>
					{receiptItem.price} {currency || "unknown"}
				</Text>
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
					title="Save receipt item price"
					light
					isLoading={updateMutation.isLoading}
					disabled={Boolean(inputState.error)}
					onClick={() => updatePrice(getValue())}
					icon={<CheckMark size={24} />}
				/>
			}
			bordered
			width="$28"
		/>
	);
};
