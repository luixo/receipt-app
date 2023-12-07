import React from "react";

import { Button } from "@nextui-org/react";
import { MdEdit as EditIcon } from "react-icons/md";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { Currency } from "app/utils/currency";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptCurrencyInput: React.FC<Props> = ({
	receipt,
	isLoading,
}) => {
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

	return (
		<>
			<Button
				variant="light"
				onClick={openModal}
				isDisabled={
					isLoading ||
					receipt.role !== "owner" ||
					Boolean(receipt.lockedTimestamp)
				}
				isLoading={updateReceiptMutation.isLoading}
				isIconOnly
			>
				<EditIcon size={24} />
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
