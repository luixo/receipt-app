import React from "react";

import { skipToken } from "@tanstack/react-query";

import { QueryErrorMessage } from "~app/components/error-message";
import { useParticipants } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type {
	TRPCQueryErrorResult,
	TRPCQueryOutput,
	TRPCQueryResult,
} from "~app/trpc";
import { trpc } from "~app/trpc";
import { getReceiptDebtName } from "~app/utils/receipt";
import { Button } from "~components/button";
import { SendIcon, SyncIcon, UnsyncIcon } from "~components/icons";
import { Tooltip } from "~components/tooltip";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { options as debtsUpdateOptions } from "~mutations/debts/update";

type InnerProps = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

const ReceiptSyncButtonInner: React.FC<InnerProps> = ({
	receipt,
	isLoading,
}) => {
	const { participants, desyncedParticipants, nonCreatedParticipants } =
		useParticipants(receipt);

	const addMutations = participants.map(() =>
		trpc.debts.add.useMutation(
			// This is stable due to `key` based on participants ids in the upper component
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useTrpcMutationOptions(debtsAddOptions),
		),
	);
	const updateMutations = participants.map(({ userId }) => {
		const matchedDesyncedParticipant = desyncedParticipants.find(
			(participant) => participant.userId === userId,
		);
		return trpc.debts.update.useMutation(
			// This is stable due to `key` based on participants ids in the upper component
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useTrpcMutationOptions(debtsUpdateOptions, {
				context: matchedDesyncedParticipant?.currentDebt || skipToken,
			}),
		);
	});

	const propagateDebts = React.useCallback(() => {
		nonCreatedParticipants.forEach((participant) => {
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
		nonCreatedParticipants,
	]);
	const isPropagating =
		addMutations.some((mutation) => mutation.isPending) ||
		updateMutations.some((mutation) => mutation.isPending);

	const emptyItemsAmount = receipt.items.filter(
		(item) => item.parts.length === 0,
	).length;
	const emptyItemsWarning = React.useMemo(() => {
		if (emptyItemsAmount === 0) {
			return;
		}
		return `There are ${emptyItemsAmount} empty items, cannot lock`;
	}, [emptyItemsAmount]);
	const hasDesyncedParticipants = desyncedParticipants.length !== 0;
	const hasNonCreatedParticipants = nonCreatedParticipants.length !== 0;
	const button =
		hasDesyncedParticipants || hasNonCreatedParticipants ? (
			<Button
				variant="ghost"
				title={hasDesyncedParticipants ? "Update debts" : "Propagate debts"}
				isLoading={isPropagating}
				isDisabled={isPropagating || Boolean(emptyItemsWarning) || isLoading}
				onClick={propagateDebts}
				color="primary"
				isIconOnly
			>
				{hasDesyncedParticipants ? (
					<SyncIcon size={24} />
				) : (
					<SendIcon size={24} />
				)}
			</Button>
		) : (
			<Button
				variant="flat"
				title="Synced"
				isDisabled
				color={emptyItemsAmount !== 0 ? "warning" : "success"}
				isIconOnly
			>
				{emptyItemsAmount !== 0 ? (
					<UnsyncIcon size={24} />
				) : (
					<SyncIcon size={24} />
				)}
			</Button>
		);
	if (!emptyItemsWarning) {
		return button;
	}
	return (
		<Tooltip content={emptyItemsWarning} placement="bottom-end">
			{button}
		</Tooltip>
	);
};

type Props = Omit<InnerProps, "itemsQuery"> & {
	queries: TRPCQueryResult<"debts.get">[];
};

export const ReceiptSyncButton: React.FC<Props> = ({
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
	return <ReceiptSyncButtonInner {...props} receipt={receipt} />;
};
