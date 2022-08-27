import React from "react";

import { cache } from "app/cache";
import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	isLoading: boolean;
};

export const DebtCurrencyInput: React.FC<Props> = ({ debt, isLoading }) => {
	const currency = useFormattedCurrency(debt.currency);
	const [isModalOpen, { setTrue: openModal, setFalse: closeModal }] =
		useBooleanState();

	const updateReceiptMutation = trpc.useMutation(
		"debts.update",
		useTrpcMutationOptions(cache.debts.update.mutationOptions, debt)
	);
	const saveCurrency = React.useCallback(
		(nextCurrency: TRPCQueryOutput<"currency.get-list">["list"][number]) => {
			if (nextCurrency.code === debt.currency) {
				return;
			}
			closeModal();
			updateReceiptMutation.mutate({
				id: debt.id,
				update: { type: "currency", currency: nextCurrency!.code },
			});
		},
		[updateReceiptMutation, debt.id, debt.currency, closeModal]
	);

	return (
		<>
			<IconButton
				auto
				light
				onClick={openModal}
				disabled={isLoading || debt.locked}
				isLoading={updateReceiptMutation.isLoading}
				css={{ p: 0 }}
			>
				{currency}
			</IconButton>
			<CurrenciesPicker
				onChange={saveCurrency}
				modalOpen={isModalOpen}
				onModalClose={closeModal}
			/>
		</>
	);
};
