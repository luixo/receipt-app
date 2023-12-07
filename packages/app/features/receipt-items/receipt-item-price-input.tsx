import React from "react";

import { styled } from "@nextui-org/react";
import { Button, Input, Spacer } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";
import { MdEdit as EditIcon } from "react-icons/md";

import { Text } from "app/components/base/text";
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
				unsetEditing();
				return;
			}
			updateMutation.mutate({
				id: receiptItem.id,
				update: { type: "price", price },
			});
		},
		[updateMutation, receiptItem.id, receiptItem.price, unsetEditing],
	);
	const currency = useFormattedCurrency(currencyCode);

	if (!isEditing) {
		return (
			<Wrapper>
				<Text>
					{receiptItem.price} {currency}
				</Text>
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
					<Spacer x={2} />
				)}
			</Wrapper>
		);
	}

	const isPriceSync = receiptItem.price === getNumberValue();

	return (
		<Input
			{...bindings}
			value={bindings.value.toString()}
			aria-label="Receipt item price"
			labelPlacement="outside"
			className="w-28"
			isDisabled={updateMutation.isLoading || isLoading}
			isInvalid={Boolean(inputState.error || updateMutation.error)}
			errorMessage={inputState.error?.message || updateMutation.error?.message}
			endContent={
				<Button
					title="Save receipt item price"
					variant="light"
					isLoading={updateMutation.isLoading}
					isDisabled={Boolean(inputState.error)}
					color={isPriceSync ? "success" : "warning"}
					onClick={() => updatePrice(getNumberValue())}
					isIconOnly
				>
					<CheckMark size={24} />
				</Button>
			}
			variant="bordered"
		/>
	);
};
