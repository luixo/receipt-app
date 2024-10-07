import React from "react";
import { View } from "react-native";

import { skipToken } from "@tanstack/react-query";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { LoadableUser } from "~app/components/app/loadable-user";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { Participant } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { isDebtInSyncWithReceipt } from "~app/utils/debts";
import { getReceiptDebtName } from "~app/utils/receipt";
import { Button } from "~components/button";
import { ReceiptIcon, SendIcon, SyncIcon, ZeroIcon } from "~components/icons";
import { Text } from "~components/text";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { options as debtsUpdateOptions } from "~mutations/debts/update";

export type LockedReceipt = Omit<
	TRPCQueryOutput<"receipts.get">,
	"lockedTimestamp"
> & { lockedTimestamp: Date };

type Props = {
	receipt: LockedReceipt;
	participant: Participant;
};

export const ReceiptParticipantDebt: React.FC<Props> = ({
	receipt,
	participant,
}) => {
	const currency = useFormattedCurrency(receipt.currencyCode);

	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(debtsUpdateOptions, {
			context: participant.currentDebt
				? {
						...participant.currentDebt,
						userId: participant.userId,
				  }
				: skipToken,
		}),
	);
	const updateDebt = React.useCallback(
		(currentDebt: NonNullable<Participant["currentDebt"]>) =>
			updateMutation.mutate({
				id: currentDebt.id,
				update: {
					amount: participant.sum,
					currencyCode: receipt.currencyCode,
					timestamp: receipt.issued,
					receiptId: receipt.id,
				},
			}),
		[
			updateMutation,
			participant.sum,
			receipt.currencyCode,
			receipt.issued,
			receipt.id,
		],
	);

	const addMutation = trpc.debts.add.useMutation(
		useTrpcMutationOptions(debtsAddOptions),
	);
	const addDebt = React.useCallback(
		() =>
			addMutation.mutate({
				currencyCode: receipt.currencyCode,
				userId: participant.userId,
				amount: participant.sum,
				timestamp: receipt.issued,
				note: getReceiptDebtName(receipt.name),
				receiptId: receipt.id,
			}),
		[
			addMutation,
			participant.sum,
			receipt.currencyCode,
			receipt.issued,
			receipt.name,
			participant.userId,
			receipt.id,
		],
	);

	const { currentDebt } = participant;
	const isReceiptSyncedWithOurDebt = currentDebt
		? isDebtInSyncWithReceipt(
				{ ...receipt, participantSum: participant.sum },
				currentDebt,
		  )
		: false;
	const isUpdating = updateMutation.isPending || addMutation.isPending;
	const user = <LoadableUser className="self-start" id={participant.userId} />;

	return (
		<View className="flex-col" testID="participant-debt">
			<View className="mb-3 md:hidden">{user}</View>
			<View className="flex-row gap-4">
				<View className="flex-[4] max-md:hidden">{user}</View>
				<View className="flex-[2] max-md:flex-1">
					<Text>{`${participant.sum} ${currency}`}</Text>
				</View>
				<View
					className="flex-[2] flex-row max-md:flex-1"
					testID="participant-debt-status-icon"
				>
					{participant.sum === 0 ? (
						<ZeroIcon data-testid="receipt-zero-icon" size={36} />
					) : (
						<>
							{participant.currentDebt && !isReceiptSyncedWithOurDebt ? (
								<ReceiptIcon
									size={36}
									className="text-danger"
									data-testid="receipt-mismatch-icon"
								/>
							) : null}
							{participant.currentDebt ? (
								<DebtSyncStatus
									debt={participant.currentDebt}
									theirDebt={participant.currentDebt.their}
									size="lg"
								/>
							) : null}
						</>
					)}
				</View>
				<View className="flex-1" testID="participant-debt-action">
					{isReceiptSyncedWithOurDebt || participant.sum === 0 ? null : (
						<Button
							title={
								participant.currentDebt
									? "Update debt for a user"
									: "Send debt to a user"
							}
							isLoading={isUpdating}
							isDisabled={isUpdating}
							isIconOnly
							color="primary"
							onClick={() =>
								participant.currentDebt
									? updateDebt(participant.currentDebt)
									: addDebt()
							}
						>
							{participant.currentDebt ? (
								<SyncIcon size={24} />
							) : (
								<SendIcon size={24} />
							)}
						</Button>
					)}
				</View>
			</View>
		</View>
	);
};
