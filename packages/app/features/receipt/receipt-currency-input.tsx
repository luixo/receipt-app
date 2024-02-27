import React from "react";
import { View } from "react-native";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { Text } from "~app/components/base/text";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { mutations } from "~app/mutations";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { ReceiptsId } from "~web/db/models";

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
	const formattedCurrencyCode = useFormattedCurrency(currencyCode);
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setTrue: openModal, setFalse: closeModal },
	] = useBooleanState();

	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options),
	);
	const saveCurrency = React.useCallback(
		(nextCurrencyCode: CurrencyCode) => {
			closeModal();
			if (nextCurrencyCode === currencyCode) {
				return;
			}
			updateReceiptMutation.mutate({
				id: receiptId,
				update: { type: "currencyCode", currencyCode: nextCurrencyCode },
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
