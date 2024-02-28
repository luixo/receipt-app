import React from "react";

import { Button } from "@nextui-org/react";
import {
	MdInfo as InfoIcon,
	MdSend as SendIcon,
	MdSync as SyncIcon,
} from "react-icons/md";

import { QueryErrorMessage } from "~app/components/error-message";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { mutations } from "~app/mutations";
import type {
	TRPCQueryErrorResult,
	TRPCQueryResult,
	TRPCQuerySuccessResult,
} from "~app/trpc";
import { trpc } from "~app/trpc";
import { getReceiptDebtName } from "~app/utils/receipt";
import { getParticipantSums } from "~app/utils/receipt-item";
import type { NonNullableField } from "~utils";

import { ReceiptDebtSyncInfoModal } from "./receipt-debt-sync-info-modal";
import {
	type LockedReceipt,
	isDebtInSyncWithReceipt,
} from "./receipt-participant-debt";

type InnerProps = {
	queries: TRPCQuerySuccessResult<"debts.get">[];
	receipt: LockedReceipt;
};

const ReceiptPropagateButtonInner: React.FC<InnerProps> = ({
	queries,
	receipt,
}) => {
	const debts = React.useMemo(
		() => queries.map((query) => query.data),
		[queries],
	);
	const participants = React.useMemo(
		() =>
			getParticipantSums(receipt.id, receipt.items, receipt.participants)
				.map((participant) => ({
					userId: participant.userId,
					sum: participant.sum,
					currentDebt: debts.find((debt) => debt.userId === participant.userId),
				}))
				.filter((participant) => participant.userId !== receipt.selfUserId),
		[
			receipt.items,
			receipt.participants,
			receipt.id,
			debts,
			receipt.selfUserId,
		],
	);

	const syncableParticipants = React.useMemo(
		() => participants.filter(({ sum }) => sum !== 0),
		[participants],
	);
	// Debts not being created yet
	const unsyncedParticipants = React.useMemo(
		() => syncableParticipants.filter(({ currentDebt }) => !currentDebt),
		[syncableParticipants],
	);
	// Debts being de-synced from the receipt
	const desyncedParticipants = React.useMemo(
		() =>
			syncableParticipants.filter(
				(
					participant,
				): participant is NonNullableField<
					typeof participant,
					"currentDebt"
				> =>
					participant.currentDebt
						? !isDebtInSyncWithReceipt(
								{ ...receipt, participantSum: participant.sum },
								participant.currentDebt,
						  )
						: false,
			),
		[syncableParticipants, receipt],
	);

	const addMutations = participants.map(() =>
		trpc.debts.add.useMutation(
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useTrpcMutationOptions(mutations.debts.add.options),
		),
	);
	const updateMutations = participants.map(({ currentDebt, userId }) => {
		const matchedDesyncedParticipant = desyncedParticipants.find(
			(participant) => participant.userId === userId,
		);
		return trpc.debts.update.useMutation(
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useTrpcMutationOptions(mutations.debts.update.options, {
				context: matchedDesyncedParticipant
					? {
							userId,
							amount: matchedDesyncedParticipant.currentDebt.amount,
							currencyCode: matchedDesyncedParticipant.currentDebt.currencyCode,
							receiptId: matchedDesyncedParticipant.currentDebt.receiptId,
					  }
					: {
							userId,
							amount: currentDebt?.amount ?? 0,
							currencyCode: currentDebt?.currencyCode ?? "unknown",
							receiptId: currentDebt?.receiptId,
					  },
			}),
		);
	});

	const propagateDebts = React.useCallback(() => {
		unsyncedParticipants.forEach((participant) => {
			const participantIndex = participants.indexOf(participant);
			const matchedMutation = addMutations[participantIndex];
			if (!matchedMutation) {
				return;
			}
			matchedMutation.mutate({
				note: getReceiptDebtName(receipt.name),
				currencyCode: receipt.currencyCode,
				userId: participant.userId,
				amount: participant.sum,
				timestamp: receipt.issued,
				receiptId: receipt.id,
			});
		});
		desyncedParticipants.forEach((participant) => {
			const participantIndex = participants.indexOf(participant);
			const matchedMutation = updateMutations[participantIndex];
			if (!matchedMutation) {
				return;
			}
			matchedMutation.mutate({
				id: participant.currentDebt.id,
				update: {
					amount: participant.sum,
					currencyCode: receipt.currencyCode,
					timestamp: receipt.issued,
					locked: true,
					receiptId: receipt.id,
				},
			});
		});
	}, [
		participants,
		addMutations,
		updateMutations,
		receipt.id,
		receipt.currencyCode,
		receipt.issued,
		receipt.name,
		desyncedParticipants,
		unsyncedParticipants,
	]);
	const isPropagating =
		addMutations.some((mutation) => mutation.isPending) ||
		updateMutations.some((mutation) => mutation.isPending);

	const [
		infoPopoverOpen,
		{ switchValue: switchInfoButtonPopover, setTrue: openInfoButtonPopover },
	] = useBooleanState();
	return (
		<>
			{desyncedParticipants.length !== 0 ||
			unsyncedParticipants.length !== 0 ? (
				<Button
					variant="ghost"
					title={
						desyncedParticipants.length === 0
							? "Propagate debts"
							: "Update debts"
					}
					isLoading={isPropagating}
					isDisabled={isPropagating}
					onClick={propagateDebts}
					color="primary"
					isIconOnly
				>
					{desyncedParticipants.length === 0 ? (
						<SendIcon size={24} />
					) : (
						<SyncIcon size={24} />
					)}
				</Button>
			) : null}
			{desyncedParticipants.length !== 0 ? (
				<Button
					onClick={openInfoButtonPopover}
					color="primary"
					isIconOnly
					title="Show sync status"
				>
					<InfoIcon size={24} />
				</Button>
			) : null}
			<ReceiptDebtSyncInfoModal
				isOpen={infoPopoverOpen}
				switchModalOpen={switchInfoButtonPopover}
				participants={participants}
				receipt={receipt}
			/>
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
	if (queries.some((query) => query.status === "pending")) {
		return null;
	}
	const errorQuery = queries.find(
		(query): query is TRPCQueryErrorResult<"debts.get"> =>
			query.status === "error",
	);
	if (errorQuery) {
		return <QueryErrorMessage query={errorQuery} />;
	}
	return (
		<ReceiptPropagateButtonInner
			{...props}
			receipt={receipt}
			queries={queries as TRPCQuerySuccessResult<"debts.get">[]}
		/>
	);
};
