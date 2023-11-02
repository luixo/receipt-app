import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdSend as SendIcon } from "react-icons/md";

import { QueryErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import type {
	TRPCQueryErrorResult,
	TRPCQueryResult,
	TRPCQuerySuccessResult,
} from "app/trpc";
import { trpc } from "app/trpc";
import { getParticipantSums } from "app/utils/receipt-item";

import { ReceiptDebtSyncInfoButton } from "./receipt-debt-sync-info-button";
import type {
	DebtParticipant,
	LockedReceipt,
} from "./receipt-participant-debt";

type InnerProps = {
	queries: TRPCQuerySuccessResult<"debts.get">[];
	itemsQuery: TRPCQuerySuccessResult<"receiptItems.get">;
	receipt: LockedReceipt;
	isLoading: boolean;
	isPropagating: boolean;
	propagateDebts: () => void;
};

export const showPropagateButton = (participants: DebtParticipant[]) => {
	const noneIsSyncedYet = participants.every(
		({ currentDebt }) => !currentDebt?.lockedTimestamp,
	);
	const atLeastOneIsSyncable = participants.some(
		({ currentDebt, sum }) =>
			sum !== 0 &&
			(!currentDebt ||
				currentDebt.lockedTimestamp !== currentDebt.their?.lockedTimestamp),
	);
	return noneIsSyncedYet && atLeastOneIsSyncable;
};

const ReceiptPropagateButtonInner: React.FC<InnerProps> = ({
	queries,
	itemsQuery,
	receipt,
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
				receipt.id,
				itemsQuery.data.items,
				itemsQuery.data.participants,
			)
				.map((participant) => ({
					userId: participant.remoteUserId,
					sum: participant.sum,
					currentDebt: debts.find(
						(debt) => debt.userId === participant.remoteUserId,
					),
				}))
				.filter((participant) => participant.userId !== receipt.selfUserId),
		[itemsQuery.data, receipt.id, debts, receipt.selfUserId],
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
					receipt={receipt}
				/>
			)}
		</>
	);
};

type Props = Omit<InnerProps, "queries" | "itemsQuery"> & {
	queries: TRPCQueryResult<"debts.get">[];
};

export const ReceiptPropagateButton: React.FC<Props> = ({
	receipt,
	queries,
	...props
}) => {
	const itemsQuery = trpc.receiptItems.get.useQuery({ receiptId: receipt.id });
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
			receipt={receipt}
			queries={queries as TRPCQuerySuccessResult<"debts.get">[]}
			itemsQuery={itemsQuery}
		/>
	);
};
