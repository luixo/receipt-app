import React from "react";

import { skipToken, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useDecimals } from "~app/hooks/use-decimals";
import { useParticipantsWithDebts } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { getReceiptDebtName } from "~app/utils/receipt";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { SendIcon, SyncIcon, UnsyncIcon } from "~components/icons";
import { Tooltip } from "~components/tooltip";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { options as debtsUpdateOptions } from "~mutations/debts/update";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptSyncButton = suspendedFallback<Props>(
	({ receipt, isLoading }) => {
		const { t } = useTranslation("receipts");
		const trpc = useTRPC();
		const {
			participantsWithDebts,
			desyncedParticipants,
			nonCreatedParticipants,
		} = useParticipantsWithDebts(receipt);

		const addMutations = participantsWithDebts.map(() =>
			useMutation(
				trpc.debts.add.mutationOptions(useTrpcMutationOptions(debtsAddOptions)),
			),
		);
		const updateMutations = participantsWithDebts.map(({ userId }) => {
			const matchedDesyncedParticipant = desyncedParticipants.find(
				(participant) => participant.userId === userId,
			);
			return useMutation(
				trpc.debts.update.mutationOptions(
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
				const participantIndex = participantsWithDebts.indexOf(participant);
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
				const participantIndex = participantsWithDebts.indexOf(participant);
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
			participantsWithDebts,
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
	},
	<Button variant="flat" isDisabled color="success" isIconOnly>
		<SyncIcon size={24} />
	</Button>,
);
