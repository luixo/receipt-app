import React from "react";

import { skipToken, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useParticipantsWithDebts } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { isDebtInSyncWithReceipt } from "~app/utils/debts";
import { getReceiptDebtName } from "~app/utils/receipt";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
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
		const { participantsWithDebts, syncableParticipants } =
			useParticipantsWithDebts(receipt);
		const ourDebtsParticipants = React.useMemo(
			() =>
				syncableParticipants.map(({ balance, currentDebt, userId }) => {
					const ourDebt = currentDebt?.our;
					if (!ourDebt) {
						return { sum: balance, userId };
					}
					return {
						sum: balance,
						debt: { ...ourDebt, id: currentDebt.id },
						userId,
					};
				}),
			[syncableParticipants],
		);
		// Debts that are already created
		const createdParticipants = React.useMemo(
			() =>
				ourDebtsParticipants.filter(
					(
						participant,
					): participant is Extract<
						typeof participant,
						{ debt: NonNullable<unknown> }
					> => Boolean(participant.debt),
				),
			[ourDebtsParticipants],
		);
		// Debts not created yet
		const nonCreatedParticipants = React.useMemo(
			() =>
				ourDebtsParticipants.filter(
					(participant) =>
						!createdParticipants.includes(
							participant as (typeof createdParticipants)[number],
						),
				),
			[ourDebtsParticipants, createdParticipants],
		);
		// Debts being de-synced from the receipt
		const desyncedParticipants = React.useMemo(
			() =>
				createdParticipants.filter(
					({ sum, debt }) =>
						!isDebtInSyncWithReceipt({ ...receipt, participantSum: sum }, debt),
				),
			[createdParticipants, receipt],
		);

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
						context: matchedDesyncedParticipant?.debt
							? { currDebt: { ...matchedDesyncedParticipant.debt, userId } }
							: skipToken,
					}),
				),
			);
		});

		const propagateDebts = React.useCallback(() => {
			nonCreatedParticipants.forEach((participant) => {
				const participantIndex = participantsWithDebts.findIndex(
					({ userId }) => userId === participant.userId,
				);
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
				const participantIndex = participantsWithDebts.findIndex(
					({ userId }) => userId === participant.userId,
				);
				const matchedMutation = updateMutations[participantIndex];
				if (!matchedMutation) {
					return;
				}
				matchedMutation.mutate({
					id: participant.debt.id,
					update: {
						amount: participant.sum,
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
						<Icon name="sync" className="size-6" />
					) : (
						<Icon name="send" className="size-6" />
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
						<Icon name="unsync" className="size-6" />
					) : (
						<Icon name="sync" className="size-6" />
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
		<Icon name="sync" className="size-6" />
	</Button>,
);
