import React from "react";
import { View } from "react-native";

import { skipToken, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { useDecimals } from "~app/hooks/use-decimals";
import type { Participant } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { areDebtsSynced } from "~app/utils/debts";
import { getReceiptDebtName } from "~app/utils/receipt";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { SendIcon, SyncIcon, ZeroIcon } from "~components/icons";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { options as debtsUpdateOptions } from "~mutations/debts/update";
import { parsers } from "~utils/date";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	participant: Participant;
};

export const ReceiptParticipantActions: React.FC<Props> = ({
	receipt,
	participant,
}) => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const updateMutation = useMutation(
		trpc.debts.update.mutationOptions(
			useTrpcMutationOptions(debtsUpdateOptions, {
				context: participant.currentDebt
					? {
							currDebt: {
								...participant.currentDebt,
								userId: participant.userId,
							},
						}
					: skipToken,
			}),
		),
	);
	const { fromSubunitToUnit } = useDecimals();
	const sum = fromSubunitToUnit(
		participant.debtSumDecimals - participant.paySumDecimals,
	);
	const updateDebt = React.useCallback(
		(currentDebt: NonNullable<Participant["currentDebt"]>) => {
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

	const isUpdating = updateMutation.isPending || addMutation.isPending;
	const { currentDebt } = participant;

	const expectedDebt = React.useMemo(
		() => ({
			amount: sum,
			currencyCode: receipt.currencyCode,
			timestamp: receipt.issued,
			updatedAt:
				currentDebt?.updatedAt ??
				parsers.zonedDateTime("1900-01-01T00:00:00.000Z"),
		}),
		[currentDebt?.updatedAt, receipt.currencyCode, receipt.issued, sum],
	);

	return (
		<View className="flex flex-row items-center gap-3 empty:hidden">
			{sum === 0 ? (
				<ZeroIcon data-testid="receipt-zero-icon" size={36} />
			) : currentDebt ? (
				<>
					{areDebtsSynced(expectedDebt, currentDebt) ? (
						<DebtSyncStatus
							debt={expectedDebt}
							theirDebt={currentDebt.their}
							size="lg"
						/>
					) : (
						<Button
							title={t("participants.actions.updateButton")}
							isLoading={isUpdating}
							isDisabled={isUpdating}
							isIconOnly
							color="primary"
							onPress={() => updateDebt(currentDebt)}
						>
							<SyncIcon size={24} />
						</Button>
					)}
				</>
			) : (
				<Button
					title={t("participants.actions.sendButton")}
					isLoading={isUpdating}
					isDisabled={isUpdating}
					isIconOnly
					color="primary"
					onPress={addDebt}
				>
					<SendIcon size={24} />
				</Button>
			)}
		</View>
	);
};
