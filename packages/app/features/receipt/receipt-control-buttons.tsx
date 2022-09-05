import React from "react";

import { Spacer, styled } from "@nextui-org/react";

import { cache } from "app/cache";
import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { QueryErrorMessage } from "app/components/error-message";
import { LockedIcon } from "app/components/locked-icon";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

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
	const accountQuery = trpc.useQuery(["account.get"]);

	const receiptDebtsQuery = trpc.useQuery([
		"debts.getReceipt",
		{ receiptId: receipt.id },
	]);

	const propagateMutation = trpc.useMutation(
		"receipts.propagateDebts",
		useTrpcMutationOptions(cache.receipts.propagateDebts.mutationOptions)
	);
	const propagateDebts = React.useCallback(
		() => propagateMutation.mutate({ receiptId: receipt.id }),
		[propagateMutation, receipt.id]
	);

	return (
		<Wrapper locked={receipt.locked}>
			<ReceiptParticipantResolvedButton
				ghost
				receiptId={receipt.id}
				remoteUserId={receipt.selfUserId}
				// Typesystem doesn't know that we use account id as self user id
				localUserId={accountQuery.data?.id! as UsersId}
				resolved={receipt.participantResolved}
				disabled={deleteLoading || accountQuery.status !== "success"}
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
							currency={receipt.currency}
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
			{accountQuery.status === "error" ? (
				<>
					<Spacer x={1} />
					<QueryErrorMessage query={accountQuery} />
				</>
			) : null}
		</Wrapper>
	);
};
