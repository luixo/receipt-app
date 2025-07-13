import React from "react";
import { View } from "react-native";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useDecimals } from "~app/hooks/use-decimals";
import type { Participant } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { areDebtsSynced } from "~app/utils/debts";
import { getReceiptDebtName } from "~app/utils/receipt";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { SendIcon, SyncIcon, ZeroIcon } from "~components/icons";
import type { DebtsId } from "~db/models";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { options as debtsUpdateOptions } from "~mutations/debts/update";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	participant: Participant;
};

export const ReceiptParticipantNoDebtAction: React.FC<Props> = ({
	receipt,
	participant,
}) => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const { fromSubunitToUnit } = useDecimals();
	const sum = fromSubunitToUnit(
		participant.debtSumDecimals - participant.paySumDecimals,
	);
	const addMutation = useMutation(
		trpc.debts.add.mutationOptions(useTrpcMutationOptions(debtsAddOptions)),
	);
	const addDebt = React.useCallback(() => {
		addMutation.mutate({
			currencyCode: receipt.currencyCode,
			userId: participant.userId,
			amount: sum,
			timestamp: receipt.issued,
			note: getReceiptDebtName(receipt.name),
			receiptId: receipt.id,
		});
	}, [
		addMutation,
		sum,
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
			<SendIcon size={24} />
		</Button>
	);
};

export const ReceiptParticipantDebtActions = suspendedFallback<
	Omit<Props, "participant"> & {
		participant: Omit<Props["participant"], "debtId"> & { debtId: DebtsId };
	}
>(
	({ receipt, participant }) => {
		const { t } = useTranslation("receipts");
		const trpc = useTRPC();
		const { data: participantDebt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: participant.debtId }),
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
		const { fromSubunitToUnit } = useDecimals();
		const sum = fromSubunitToUnit(
			participant.debtSumDecimals - participant.paySumDecimals,
		);
		const updateDebt = React.useCallback(
			(currentDebt: TRPCQueryOutput<"debts.get">) => {
				updateMutation.mutate({
					id: currentDebt.id,
					update: {
						amount: sum,
						currencyCode: receipt.currencyCode,
						timestamp: receipt.issued,
						receiptId: receipt.id,
					},
				});
			},
			[updateMutation, sum, receipt.currencyCode, receipt.issued, receipt.id],
		);

		const expectedDebt = React.useMemo(
			() => ({
				amount: sum,
				currencyCode: receipt.currencyCode,
				timestamp: receipt.issued,
				updatedAt: participantDebt.updatedAt,
			}),
			[participantDebt.updatedAt, receipt.currencyCode, receipt.issued, sum],
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
						<SyncIcon size={24} />
					</Button>
				)}
			</View>
		);
	},
	<SyncIcon size={36} />,
);

export const ReceiptParticipantActions: React.FC<Props> = ({
	receipt,
	participant,
}) => {
	const { fromSubunitToUnit } = useDecimals();
	const sum = fromSubunitToUnit(
		participant.debtSumDecimals - participant.paySumDecimals,
	);

	return (
		<>
			{sum === 0 ? (
				<ZeroIcon data-testid="receipt-zero-icon" size={36} />
			) : participant.debtId ? (
				<ReceiptParticipantDebtActions
					receipt={receipt}
					participant={{ ...participant, debtId: participant.debtId }}
				/>
			) : (
				<ReceiptParticipantNoDebtAction
					receipt={receipt}
					participant={participant}
				/>
			)}
		</>
	);
};
