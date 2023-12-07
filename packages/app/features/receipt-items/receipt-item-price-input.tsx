import React from "react";

import { Button } from "@nextui-org/react";
import { MdEdit as EditIcon } from "react-icons/md";

import { Input } from "app/components/base/input";
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
			<>
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
				) : null}
			</>
		);
	}

	return (
		<Input
			{...bindings}
			aria-label="Receipt item price"
			className="w-28"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save receipt item price",
				isHidden: receiptItem.price === getNumberValue(),
				onClick: () => updatePrice(getNumberValue()),
			}}
			variant="bordered"
		/>
	);
};
