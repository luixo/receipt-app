import React from "react";

import { Input, Text, styled, Spacer } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { priceSchema } from "app/utils/validation";
import type { ReceiptsId } from "next-app/db/models";

const Wrapper = styled("div", { display: "flex", alignItems: "center" });

type ReceiptItem = TRPCQueryOutput<"receiptItems.get">["items"][number];

type Props = {
	receiptId: ReceiptsId;
	receiptItem: ReceiptItem;
	readOnly?: boolean;
	currencyCode?: CurrencyCode;
	isLoading: boolean;
};

export const ReceiptItemPriceInput: React.FC<Props> = ({
	receiptId,
	receiptItem,
	isLoading,
	currencyCode,
	readOnly,
}) => {
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const {
		bindings,
		state: inputState,
		getNumberValue,
	} = useSingleInput({
		initialValue: receiptItem.price,
		schema: priceSchema,
		type: "number",
	});

	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(mutations.receiptItems.update.options, {
			context: receiptId,
			onSuccess: unsetEditing,
		}),
	);
	const updatePrice = React.useCallback(
		(price: number) => {
			if (price === receiptItem.price) {
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "price", price },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.price],
	);
	const currency = useFormattedCurrency(currencyCode);

	if (!isEditing) {
		return (
			<Wrapper>
				<Text>
					{receiptItem.price} {currency}
				</Text>
				{!readOnly ? (
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
			aria-label="Receipt item price"
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
					onClick={() => updatePrice(getNumberValue())}
					icon={<CheckMark size={24} />}
				/>
			}
			bordered
			width="$28"
		/>
	);
};
