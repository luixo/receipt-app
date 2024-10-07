import React from "react";
import { View } from "react-native";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { Text } from "~components/text";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";
import { round } from "~utils/math";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptCurrencyInput: React.FC<Props> = ({
	receipt,
	isLoading,
}) => {
	const formattedCurrencyCode = useFormattedCurrency(receipt.currencyCode);
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setTrue: openModal, setFalse: closeModal },
	] = useBooleanState();

	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(receiptsUpdateOptions),
	);
	const saveCurrency = React.useCallback(
		(nextCurrencyCode: CurrencyCode) => {
			closeModal();
			if (nextCurrencyCode === receipt.currencyCode) {
				return;
			}
			updateReceiptMutation.mutate({
				id: receipt.id,
				update: { type: "currencyCode", currencyCode: nextCurrencyCode },
			});
		},
		[updateReceiptMutation, receipt.id, receipt.currencyCode, closeModal],
	);
	const topCurrenciesQuery = trpc.currency.topReceipts.useQuery();
	const disabled =
		updateReceiptMutation.isPending ||
		isLoading ||
		receipt.ownerUserId !== receipt.selfUserId ||
		Boolean(receipt.lockedTimestamp);
	const sum = round(
		receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
	);

	return (
		<>
			<View
				className={disabled ? undefined : "cursor-pointer"}
				onClick={disabled ? undefined : openModal}
			>
				<Text className="text-2xl">
					{sum} {formattedCurrencyCode}
				</Text>
			</View>
			<CurrenciesPicker
				onChange={saveCurrency}
				modalOpen={isModalOpen}
				switchModalOpen={switchModalOpen}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
		</>
	);
};
