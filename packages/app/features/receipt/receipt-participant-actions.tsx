import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import type { Participant } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { areDebtsSynced } from "~app/utils/debts";
import { getReceiptDebtName } from "~app/utils/receipt";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { View } from "~components/view";
import type { DebtId } from "~db/ids";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { options as debtsUpdateOptions } from "~mutations/debts/update";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	participant: Participant;
	outcomingDebtId?: DebtId;
};

export const ReceiptParticipantNoDebtAction: React.FC<
	Omit<Props, "outcomingDebtId">
> = ({ receipt, participant }) => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const addMutation = useMutation(
		trpc.debts.add.mutationOptions(useTrpcMutationOptions(debtsAddOptions)),
	);
	const addDebt = React.useCallback(() => {
		addMutation.mutate({
			currencyCode: receipt.currencyCode,
			userId: participant.userId,
			amount: participant.balance,
			timestamp: receipt.issued,
			note: getReceiptDebtName(receipt.name),
			receiptId: receipt.id,
		});
	}, [
		addMutation,
		participant.balance,
		receipt.currencyCode,
		receipt.issued,
		receipt.name,
		participant.userId,
		receipt.id,
	]);

	return (
		<Button
			title={t("participants.actions.sendButton")}
			isLoading={addMutation.isPending}
			isDisabled={addMutation.isPending}
			isIconOnly
			color="primary"
			onPress={addDebt}
		>
			<Icon name="send" className="size-6" />
		</Button>
	);
};

export const ReceiptParticipantDebtActions = suspendedFallback<
	Omit<Props, "outcomingDebtId"> & {
		outcomingDebtId: DebtId;
	}
>(
	({ receipt, participant, outcomingDebtId }) => {
		const { t } = useTranslation("receipts");
		const trpc = useTRPC();
		const { data: participantDebt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: outcomingDebtId }),
		);
		const updateMutation = useMutation(
			trpc.debts.update.mutationOptions(
				useTrpcMutationOptions(debtsUpdateOptions, {
					context: {
						currDebt: participantDebt,
					},
				}),
			),
		);
		const updateDebt = React.useCallback(
			(currentDebt: TRPCQueryOutput<"debts.get">) => {
				updateMutation.mutate({
					id: currentDebt.id,
					update: {
						amount: participant.balance,
						currencyCode: receipt.currencyCode,
						timestamp: receipt.issued,
						receiptId: receipt.id,
					},
				});
			},
			[
				updateMutation,
				participant.balance,
				receipt.currencyCode,
				receipt.issued,
				receipt.id,
			],
		);

		const expectedDebt = React.useMemo(
			() => ({
				amount: participant.balance,
				currencyCode: receipt.currencyCode,
				timestamp: receipt.issued,
				updatedAt: participantDebt.updatedAt,
			}),
			[
				participantDebt.updatedAt,
				receipt.currencyCode,
				receipt.issued,
				participant.balance,
			],
		);

		return (
			<View className="flex flex-row items-center gap-3 empty:hidden">
				{areDebtsSynced(expectedDebt, participantDebt) ? (
					<DebtSyncStatus
						debt={expectedDebt}
						theirDebt={participantDebt.their}
						size="lg"
					/>
				) : (
					<Button
						title={t("participants.actions.updateButton")}
						isLoading={updateMutation.isPending}
						isDisabled={updateMutation.isPending}
						isIconOnly
						color="primary"
						onPress={() => updateDebt(participantDebt)}
					>
						<Icon name="sync" className="size-6" />
					</Button>
				)}
			</View>
		);
	},
	<Icon name="sync" className="size-9" />,
);

export const ReceiptParticipantActions: React.FC<Props> = ({
	receipt,
	participant,
	outcomingDebtId,
}) => (
	<>
		{participant.balance === 0 ? (
			<Icon name="zero" data-testid="receipt-zero-icon" className="size-9" />
		) : outcomingDebtId ? (
			<ReceiptParticipantDebtActions
				receipt={receipt}
				participant={participant}
				outcomingDebtId={outcomingDebtId}
			/>
		) : (
			<ReceiptParticipantNoDebtAction
				receipt={receipt}
				participant={participant}
			/>
		)}
	</>
);
