import React from "react";

import { useMutation } from "@tanstack/react-query";

import { CurrenciesPicker } from "#app/components/app/currencies-picker.tsx";
import { useBooleanState } from "#app/hooks/use-boolean-state.ts";
import { useLocale } from "#app/hooks/use-locale.ts";
import { useTrpcMutationOptions } from "#app/hooks/use-trpc-mutation-options.ts";
import type { Receipt } from "#app/trpc-types.ts";
import { getCurrencySymbol } from "#app/utils/currency.ts";
import type { CurrencyCode } from "#app/utils/currency.ts";
import { useTRPC } from "#app/utils/trpc.ts";
import { Text } from "#components/text.tsx";
import { View } from "#components/view.tsx";
import { options as receiptsUpdateOptions } from "#mutations/receipts/update.ts";
import { round } from "#utils/math.ts";

type Props = {
	receipt: Receipt;
	isLoading: boolean;
};

export const ReceiptAmountInput: React.FC<Props> = ({ receipt, isLoading }) => {
	const trpc = useTRPC();
	const locale = useLocale();
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setTrue: openModal, setFalse: closeModal },
	] = useBooleanState();

	const updateReceiptMutation = useMutation(
		trpc.receipts.update.mutationOptions(
			useTrpcMutationOptions(receiptsUpdateOptions),
		),
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
	const disabled =
		updateReceiptMutation.isPending ||
		isLoading ||
		receipt.ownerPeerId !== receipt.selfPeerId;
	const sum = round(
		receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
	);

	return (
		<View className="flex flex-row gap-2">
			<Text className="text-2xl/9">{sum}</Text>
			<View onPress={disabled ? undefined : openModal}>
				<Text className="text-2xl/9">
					{getCurrencySymbol(locale, receipt.currencyCode)}
				</Text>
			</View>
			<CurrenciesPicker
				onChange={saveCurrency}
				modalOpen={isModalOpen}
				switchModalOpen={switchModalOpen}
				topQueryOptions={{ type: "receipts" }}
			/>
		</View>
	);
};
