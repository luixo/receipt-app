import React from "react";

import { Spacer, styled } from "@nextui-org/react";

import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { LockedIcon } from "app/components/locked-icon";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

import { ReceiptLockedButton } from "./receipt-locked-button";
import { ReceiptPropagateButton } from "./receipt-propagate-button";
import { ReceiptSelfDebtSyncInfo } from "./receipt-self-debt-sync-info";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
	color: "$primary",

	variants: {
		locked: {
			true: {
				color: "$secondary",
			},
		},
	},
});

type Receipt = TRPCQueryOutput<"receipts.get">;

type Props = {
	receipt: Receipt;
	deleteLoading: boolean;
};

export const ReceiptControlButtons: React.FC<Props> = ({
	receipt,
	deleteLoading,
}) => {
	const receiptDebtsQuery = trpc.debts.getReceipt.useQuery({
		receiptId: receipt.id,
	});

	const propagateMutation = trpc.receipts.propagateDebts.useMutation(
		useTrpcMutationOptions(mutations.receipts.propagateDebts.options),
	);
	const propagateDebts = React.useCallback(
		() => propagateMutation.mutate({ receiptId: receipt.id }),
		[propagateMutation, receipt.id],
	);

	return (
		<Wrapper locked={receipt.locked}>
			<ReceiptParticipantResolvedButton
				ghost
				receiptId={receipt.id}
				userId={receipt.selfUserId}
				selfUserId={receipt.selfUserId}
				resolved={receipt.participantResolved}
				disabled={deleteLoading}
			/>
			<Spacer x={0.5} />
			{receipt.role === "owner" ? (
				<>
					<ReceiptLockedButton
						receiptId={receipt.id}
						locked={receipt.locked}
						isLoading={deleteLoading}
						isPropagating={propagateMutation.isLoading}
						propagateDebts={propagateDebts}
					/>
					{receipt.locked ? (
						<ReceiptPropagateButton
							receiptDebtsQuery={receiptDebtsQuery}
							receiptId={receipt.id}
							currencyCode={receipt.currencyCode}
							isLoading={deleteLoading}
							isPropagating={propagateMutation.isLoading}
							propagateDebts={propagateDebts}
						/>
					) : null}
				</>
			) : !receipt.locked ? (
				<LockedIcon
					locked={receipt.locked}
					tooltip={receipt.locked ? "Receipt locked" : "Receipt unlocked"}
					css={{ m: "$4", color: "$warning" }}
				/>
			) : (
				<ReceiptSelfDebtSyncInfo receiptId={receipt.id} />
			)}
		</Wrapper>
	);
};
