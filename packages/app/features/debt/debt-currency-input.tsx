import React from "react";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	isLoading: boolean;
};

export const DebtCurrencyInput: React.FC<Props> = ({ debt, isLoading }) => {
	const currency = useFormattedCurrency(debt.currencyCode);
	const [isModalOpen, { setTrue: openModal, setFalse: closeModal }] =
		useBooleanState();

	const updateReceiptMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
	);
	const saveCurrency = React.useCallback(
		(nextCurrency: TRPCQueryOutput<"currency.getList">[number]) => {
			if (nextCurrency.code === debt.currencyCode) {
				return;
			}
			closeModal();
			updateReceiptMutation.mutate({
				id: debt.id,
				update: { currencyCode: nextCurrency!.code },
			});
		},
		[updateReceiptMutation, debt.id, debt.currencyCode, closeModal],
	);
	const topCurrenciesQuery = trpc.currency.topDebts.useQuery();

	return (
		<>
			<IconButton
				auto
				light
				onClick={openModal}
				disabled={isLoading}
				isLoading={updateReceiptMutation.isLoading}
				css={{ p: 0 }}
			>
				{currency}
			</IconButton>
			<CurrenciesPicker
				onChange={saveCurrency}
				modalOpen={isModalOpen}
				onModalClose={closeModal}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
		</>
	);
};
