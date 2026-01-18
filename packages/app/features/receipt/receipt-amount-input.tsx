import React from "react";

import { useMutation } from "@tanstack/react-query";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { type CurrencyCode, getCurrencySymbol } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Text } from "~components/text";
import { View } from "~components/view";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";
import { round } from "~utils/math";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
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
		receipt.ownerUserId !== receipt.selfUserId;
	const sum = round(
		receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
	);

	return (
		<View className="flex flex-row gap-2">
			<Text className="text-2xl leading-9">{sum}</Text>
			<View onPress={disabled ? undefined : openModal}>
				<Text className="text-2xl leading-9">
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
