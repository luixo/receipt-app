import React from "react";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

import { ReceiptLockedButton } from "./receipt-locked-button";
import { ReceiptPropagateButton } from "./receipt-propagate-button";

type Receipt = TRPCQueryOutput<"receipts.get">;

type Props = {
	receipt: Receipt;
	deleteLoading: boolean;
};

export const ReceiptOwnerControlButton: React.FC<Props> = ({
	receipt,
	deleteLoading,
}) => {
	const debtIds =
		receipt.debt?.direction === "outcoming" ? receipt.debt.ids : [];
	const debtsQueries = trpc.useQueries((t) =>
		debtIds.map((id) => t.debts.get({ id })),
	);

	const propagateMutation = trpc.receipts.propagateDebts.useMutation(
		useTrpcMutationOptions(mutations.receipts.propagateDebts.options),
	);
	const propagateDebts = React.useCallback(
		(lockedTimestamp: Date) => () =>
			propagateMutation.mutate({ receiptId: receipt.id, lockedTimestamp }),
		[propagateMutation, receipt.id],
	);

	const lockedButton = (
		<ReceiptLockedButton
			receiptId={receipt.id}
			locked={Boolean(receipt.lockedTimestamp)}
			isLoading={deleteLoading}
			isPropagating={propagateMutation.isLoading}
			propagateDebts={propagateDebts}
		/>
	);
	if (!receipt.debt) {
		return lockedButton;
	}
	if (receipt.debt.direction === "incoming") {
		throw new Error("Unexpected owner control button with incoming debt");
	}

	return (
		<>
			{lockedButton}
			{receipt.lockedTimestamp ? (
				<ReceiptPropagateButton
					queries={debtsQueries}
					selfUserId={receipt.selfUserId}
					receiptId={receipt.id}
					receiptTimestamp={receipt.lockedTimestamp}
					currencyCode={receipt.currencyCode}
					isLoading={deleteLoading}
					isPropagating={propagateMutation.isLoading}
					propagateDebts={propagateDebts(receipt.lockedTimestamp)}
				/>
			) : null}
		</>
	);
};
