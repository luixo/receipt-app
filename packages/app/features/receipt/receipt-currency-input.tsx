import React from "react";

import { cache } from "app/cache";
import { CurrenciesPicker } from "app/components/app/currencies-picker";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

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
		useTrpcMutationOptions(cache.receipts.update.mutationOptions)
	);
	const saveCurrency = React.useCallback(
		(nextCurrency: TRPCQueryOutput<"currency.getList">["list"][number]) => {
			if (nextCurrency.code === receipt.currency) {
				return;
			}
			closeModal();
			updateReceiptMutation.mutate({
				id: receipt.id,
				update: { type: "currency", currency: nextCurrency!.code },
			});
		},
		[updateReceiptMutation, receipt.id, receipt.currency, closeModal]
	);

	return (
		<>
			<IconButton
				auto
				light
				onClick={openModal}
				disabled={isLoading || receipt.role !== "owner" || receipt.locked}
				isLoading={updateReceiptMutation.isLoading}
				css={{
					p: 0,
					lineHeight: "$lg",
					height: "initial",
					ml: "$2",
					fontSize: "inherit",
				}}
			>
				{receipt.currency}
			</IconButton>
			<CurrenciesPicker
				onChange={saveCurrency}
				modalOpen={isModalOpen}
				onModalClose={closeModal}
			/>
		</>
	);
};
