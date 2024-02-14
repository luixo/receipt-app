import React from "react";
import { View } from "react-native";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { Text } from "app/components/base/text";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import type { Currency, CurrencyCode } from "app/utils/currency";
import type { ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	currencyCode: CurrencyCode;
	isOwner: boolean;
	receiptLocked: boolean;
	sum: number;
	isLoading: boolean;
};

export const ReceiptCurrencyInput: React.FC<Props> = ({
	receiptId,
	currencyCode,
	isOwner,
	receiptLocked,
	sum,
	isLoading,
}) => {
	const currency = useFormattedCurrency(currencyCode);
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
			if (nextCurrency.code === currencyCode) {
				return;
			}
			updateReceiptMutation.mutate({
				id: receiptId,
				update: { type: "currencyCode", currencyCode: nextCurrency!.code },
			});
		},
		[updateReceiptMutation, receiptId, currencyCode, closeModal],
	);
	const topCurrenciesQuery = trpc.currency.topReceipts.useQuery();
	const disabled =
		updateReceiptMutation.isPending || isLoading || !isOwner || receiptLocked;

	return (
		<>
			<View
				className={disabled ? undefined : "cursor-pointer"}
				onClick={disabled ? undefined : openModal}
			>
				<Text className="text-2xl">
					{sum} {currency}
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
