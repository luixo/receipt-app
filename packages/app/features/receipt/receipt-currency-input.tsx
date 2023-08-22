import React from "react";

import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptCurrencyInput: React.FC<Props> = ({
	receipt,
	isLoading,
}) => {
	const [isModalOpen, { setTrue: openModal, setFalse: closeModal }] =
		useBooleanState();

	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options),
	);
	const saveCurrency = React.useCallback(
		(nextCurrency: TRPCQueryOutput<"currency.getList">[number]) => {
			if (nextCurrency.code === receipt.currencyCode) {
				return;
			}
			closeModal();
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
			<IconButton
				auto
				light
				onClick={openModal}
				disabled={
					isLoading ||
					receipt.role !== "owner" ||
					Boolean(receipt.lockedTimestamp)
				}
				isLoading={updateReceiptMutation.isLoading}
				css={{
					p: 0,
					lineHeight: "$lg",
					height: "initial",
					ml: "$2",
					fontSize: "inherit",
				}}
			>
				{receipt.currencyCode}
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
