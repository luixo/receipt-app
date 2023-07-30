import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdSend as SendIcon } from "react-icons/md";

import { QueryErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import {
	TRPCQueryErrorResult,
	TRPCQueryResult,
	TRPCQuerySuccessResult,
	trpc,
} from "app/trpc";
import { CurrencyCode } from "app/utils/currency";
import { getParticipantSums } from "app/utils/receipt-item";
import { ReceiptsId, UsersId } from "next-app/db/models";

import { ReceiptDebtSyncInfoButton } from "./receipt-debt-sync-info-button";
import { DebtParticipant } from "./receipt-participant-debt";

type InnerProps = {
	queries: TRPCQuerySuccessResult<"debts.get">[];
	itemsQuery: TRPCQuerySuccessResult<"receiptItems.get">;
	selfUserId: UsersId;
	receiptId: ReceiptsId;
	receiptTimestamp: Date;
	currencyCode: CurrencyCode;
	isLoading: boolean;
	isPropagating: boolean;
	propagateDebts: () => void;
};

export const showPropagateButton = (participants: DebtParticipant[]) => {
	const noneIsSyncedYet = participants.every(
		({ debt }) => !debt || debt.syncStatus.type === "nosync",
	);
	const atLeastOneIsSyncable = participants.some(
		({ debt }) => !debt || debt.syncStatus.type === "nosync",
	);
	return noneIsSyncedYet && atLeastOneIsSyncable;
};

const ReceiptPropagateButtonInner: React.FC<InnerProps> = ({
	queries,
	itemsQuery,
	selfUserId,
	receiptId,
	receiptTimestamp,
	currencyCode,
	isLoading,
	isPropagating,
	propagateDebts,
}) => {
	const debts = React.useMemo(
		() => queries.map((query) => query.data),
		[queries],
	);
	const participants = React.useMemo(
		() =>
			getParticipantSums(
				receiptId,
				itemsQuery.data.items,
				itemsQuery.data.participants,
			)
				.map((participant) => ({
					userId: participant.remoteUserId,
					sum: participant.sum,
					debt: debts.find((debt) => debt.userId === participant.remoteUserId),
				}))
				.filter((participant) => participant.userId !== selfUserId),
		[itemsQuery.data, receiptId, debts, selfUserId],
	);
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

type Props = Omit<InnerProps, "queries" | "itemsQuery"> & {
	queries: TRPCQueryResult<"debts.get">[];
};

export const ReceiptPropagateButton: React.FC<Props> = ({
	receiptId,
	currencyCode,
	queries,
	...props
}) => {
	const itemsQuery = trpc.receiptItems.get.useQuery({ receiptId });
	if (
		queries.some((query) => query.status === "loading") ||
		itemsQuery.status === "loading"
	) {
		return null;
	}
	const errorQuery = queries.find(
		(query): query is TRPCQueryErrorResult<"debts.get"> =>
			query.status === "error",
	);
	if (errorQuery) {
		return <QueryErrorMessage query={errorQuery} />;
	}
	if (itemsQuery.status === "error") {
		return <QueryErrorMessage query={itemsQuery} />;
	}
	return (
		<ReceiptPropagateButtonInner
			{...props}
			receiptId={receiptId}
			currencyCode={currencyCode}
			queries={queries as TRPCQuerySuccessResult<"debts.get">[]}
			itemsQuery={itemsQuery}
		/>
	);
};
