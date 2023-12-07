import React from "react";

import { Button } from "@nextui-org/react-tailwind";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { Currency } from "app/utils/currency";

type Debt = TRPCQueryOutput<"debts.get">;

type Props = {
	debt: Debt;
	isLoading: boolean;
};

export const DebtCurrencyInput: React.FC<Props> = ({ debt, isLoading }) => {
	const currency = useFormattedCurrency(debt.currencyCode);
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setTrue: openModal, setFalse: closeModal },
	] = useBooleanState();

	const updateReceiptMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
	);
	const saveCurrency = React.useCallback(
		(nextCurrency: Currency) => {
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
			<Button
				variant="light"
				onClick={openModal}
				isDisabled={isLoading}
				isLoading={updateReceiptMutation.isLoading}
				isIconOnly
			>
				{currency}
			</Button>
			<CurrenciesPicker
				onChange={saveCurrency}
				modalOpen={isModalOpen}
				switchModalOpen={switchModalOpen}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
		</>
	);
};
