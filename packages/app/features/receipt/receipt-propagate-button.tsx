import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdSend as SendIcon } from "react-icons/md";

import { QueryErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import {
	TRPCQueryOutput,
	TRPCQueryResult,
	TRPCQuerySuccessResult,
} from "app/trpc";
import { CurrencyCode } from "app/utils/currency";
import { ReceiptsId } from "next-app/db/models";

import { ReceiptDebtSyncInfoButton } from "./receipt-debt-sync-info-button";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.getReceipt">;
	receiptId: ReceiptsId;
	receiptTimestamp: Date;
	currencyCode: CurrencyCode;
	isLoading: boolean;
	isPropagating: boolean;
	propagateDebts: () => void;
};

export const showPropagateButton = (
	participants: TRPCQueryOutput<"debts.getReceipt">,
) => {
	// TODO: add info status for receipt for yourself!
	// TODO: if user is now zero in receipt - let us remove the intention to sync
	const noneIsSyncedYet = participants.every((participant) =>
		["nosync", "no-parts"].includes(participant.syncStatus.type),
	);
	const atLeastOneIsSyncable = participants.some(
		(participant) => participant.syncStatus.type === "nosync",
	);
	return noneIsSyncedYet && atLeastOneIsSyncable;
};

const ReceiptPropagateButtonInner: React.FC<InnerProps> = ({
	query,
	receiptId,
	receiptTimestamp,
	currencyCode,
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
					receiptTimestamp={receiptTimestamp}
					currencyCode={currencyCode}
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
	currencyCode,
	receiptDebtsQuery: query,
	...props
}) => {
	if (query.status === "loading") {
		return null;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return (
		<ReceiptPropagateButtonInner
			{...props}
			receiptId={receiptId}
			currencyCode={currencyCode}
			query={query}
		/>
	);
};
