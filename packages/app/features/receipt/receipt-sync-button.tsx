import React from "react";

import { skipToken, useMutation, useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { QueryErrorMessage } from "~app/components/error-message";
import { useDecimals } from "~app/hooks/use-decimals";
import { useParticipants } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { getReceiptDebtName } from "~app/utils/receipt";
import { useTRPC } from "~app/utils/trpc";
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
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const { participants, desyncedParticipants, nonCreatedParticipants } =
		useParticipants(receipt);

	const addMutations = participants.map(() =>
		// This is stable due to `key` based on participants ids in the upper component
		// eslint-disable-next-line react-hooks/rules-of-hooks
		useMutation(
			trpc.debts.add.mutationOptions(
				// eslint-disable-next-line react-hooks/rules-of-hooks
				useTrpcMutationOptions(debtsAddOptions),
			),
		),
	);
	const updateMutations = participants.map(({ userId }) => {
		const matchedDesyncedParticipant = desyncedParticipants.find(
			(participant) => participant.userId === userId,
		);
		// This is stable due to `key` based on participants ids in the upper component
		// eslint-disable-next-line react-hooks/rules-of-hooks
		return useMutation(
			trpc.debts.update.mutationOptions(
				// eslint-disable-next-line react-hooks/rules-of-hooks
				useTrpcMutationOptions(debtsUpdateOptions, {
					context: matchedDesyncedParticipant?.currentDebt
						? { currDebt: matchedDesyncedParticipant.currentDebt }
						: skipToken,
				}),
			),
		);
	});

	const { fromSubunitToUnit } = useDecimals();
	const propagateDebts = React.useCallback(() => {
		nonCreatedParticipants.forEach((participant) => {
			const participantIndex = participants.indexOf(participant);
			const matchedMutation = addMutations[participantIndex];
			if (!matchedMutation) {
				return;
			}
			const sum = fromSubunitToUnit(
				participant.debtSumDecimals - participant.paySumDecimals,
			);
			matchedMutation.mutate({
				note: getReceiptDebtName(receipt.name),
				currencyCode: receipt.currencyCode,
				userId: participant.userId,
				amount: sum,
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
			const sum = fromSubunitToUnit(
				participant.debtSumDecimals - participant.paySumDecimals,
			);
			matchedMutation.mutate({
				id: participant.currentDebt.id,
				update: {
					amount: sum,
					currencyCode: receipt.currencyCode,
					timestamp: receipt.issued,
					receiptId: receipt.id,
				},
			});
		});
	}, [
		nonCreatedParticipants,
		desyncedParticipants,
		participants,
		addMutations,
		fromSubunitToUnit,
		receipt.name,
		receipt.currencyCode,
		receipt.issued,
		receipt.id,
		updateMutations,
	]);
	const isPropagating =
		addMutations.some((mutation) => mutation.isPending) ||
		updateMutations.some((mutation) => mutation.isPending);

	const emptyItemsAmount = receipt.items.filter(
		(item) => item.consumers.length === 0,
	).length;
	const hasDesyncedParticipants = desyncedParticipants.length !== 0;
	const hasNonCreatedParticipants = nonCreatedParticipants.length !== 0;
	const button =
		hasDesyncedParticipants || hasNonCreatedParticipants ? (
			<Button
				variant="ghost"
				title={
					hasDesyncedParticipants
						? t("receipt.syncButton.update")
						: t("receipt.syncButton.propagate")
				}
				isLoading={isPropagating}
				isDisabled={isPropagating || emptyItemsAmount !== 0 || isLoading}
				onPress={propagateDebts}
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
				title={t("receipt.syncButton.synced")}
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
	if (emptyItemsAmount === 0) {
		return button;
	}
	return (
		<Tooltip
			content={t("receipt.syncButton.emptyItemsWarning", {
				count: emptyItemsAmount,
			})}
			placement="bottom-end"
		>
			{button}
		</Tooltip>
	);
};

type Props = Omit<InnerProps, "itemsQuery">;

export const ReceiptSyncButton: React.FC<Props> = ({ receipt, ...props }) => {
	const debtIds =
		receipt.debt.direction === "outcoming" ? receipt.debt.ids : [];
	const trpc = useTRPC();
	const queries = useQueries({
		queries: debtIds.map((id) => trpc.debts.get.queryOptions({ id })),
	});
	if (queries.some((query) => query.status === "pending")) {
		return null;
	}
	const errorQuery = queries.find((query) => query.status === "error");
	if (errorQuery) {
		return <QueryErrorMessage query={errorQuery} />;
	}
	return <ReceiptSyncButtonInner {...props} receipt={receipt} />;
};
