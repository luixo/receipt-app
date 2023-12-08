import React from "react";
import { View } from "react-native";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { Text } from "app/components/base/text";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { Currency } from "app/utils/currency";
import { round } from "app/utils/math";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptCurrencyInput: React.FC<Props> = ({
	receipt,
	isLoading,
}) => {
	const currency = useFormattedCurrency(receipt.currencyCode);
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setTrue: openModal, setFalse: closeModal },
	] = useBooleanState();

	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options),
	);
	const saveCurrency = React.useCallback(
		(nextCurrency: Currency) => {
			closeModal();
			if (nextCurrency.code === receipt.currencyCode) {
				return;
			}
			updateReceiptMutation.mutate({
				id: receipt.id,
				update: { type: "currencyCode", currencyCode: nextCurrency!.code },
			});
		},
		[updateReceiptMutation, receipt.id, receipt.currencyCode, closeModal],
	);
	const topCurrenciesQuery = trpc.currency.topReceipts.useQuery();
	const disabled =
		updateReceiptMutation.isLoading ||
		isLoading ||
		receipt.role !== "owner" ||
		Boolean(receipt.lockedTimestamp);

	return (
		<>
			<View
				className={disabled ? undefined : "cursor-pointer"}
				onClick={disabled ? undefined : openModal}
			>
				<Text className="text-2xl">
					{round(receipt.sum)} {currency}
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
