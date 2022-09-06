import React from "react";

import { Loading, Spacer } from "@nextui-org/react";
import { MdSend as SendIcon } from "react-icons/md";

import { QueryErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import {
	TRPCQueryOutput,
	TRPCQueryResult,
	TRPCQuerySuccessResult,
} from "app/trpc";
import { Currency } from "app/utils/currency";
import { ReceiptsId } from "next-app/db/models";

import { ReceiptDebtSyncInfoButton } from "./receipt-debt-sync-info-button";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.getReceipt">;
	receiptId: ReceiptsId;
	currency: Currency;
	isLoading: boolean;
	isPropagating: boolean;
	propagateDebts: () => void;
};

export const showPropagateButton = (
	participants: TRPCQueryOutput<"debts.getReceipt">
) => {
	// TODO: add info status for receipt for yourself!
	// TODO: if user is now zero in receipt - let us remove the intention to sync
	const noneIsSyncedYet = participants.every((participant) =>
		["nosync", "no-account", "no-parts"].includes(participant.status)
	);
	const atLeastOneIsSyncable = participants.some(
		(participant) => participant.status === "nosync"
	);
	return noneIsSyncedYet && atLeastOneIsSyncable;
};

const ReceiptPropagateButtonInner: React.FC<InnerProps> = ({
	query,
	receiptId,
	currency,
	isLoading,
	isPropagating,
	propagateDebts,
}) => {
	const participants = query.data;
	return (
		<>
			<Spacer x={0.5} />
			{showPropagateButton(participants) ? (
				<IconButton
					ghost
					isLoading={isPropagating}
					disabled={isLoading}
					onClick={propagateDebts}
					color="warning"
					icon={<SendIcon size={24} />}
				/>
			) : (
				<ReceiptDebtSyncInfoButton
					participants={participants}
					receiptId={receiptId}
					currency={currency}
				/>
			)}
		</>
	);
};

type Props = Omit<InnerProps, "query"> & {
	receiptDebtsQuery: TRPCQueryResult<"debts.getReceipt">;
};

export const ReceiptPropagateButton: React.FC<Props> = ({
	receiptId,
	currency,
	receiptDebtsQuery: query,
	...props
}) => {
	if (query.status === "loading") {
		return <Loading size="xs" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return (
		<ReceiptPropagateButtonInner
			{...props}
			receiptId={receiptId}
			currency={currency}
			query={query}
		/>
	);
};
