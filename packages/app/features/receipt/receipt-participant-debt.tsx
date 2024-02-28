import React from "react";
import { View } from "react-native";

import { Button } from "@nextui-org/react";
import {
	MdOutlineReceipt as ReceiptOffIcon,
	MdSend as SendIcon,
	MdSync as SyncIcon,
	MdExposureZero as ZeroIcon,
} from "react-icons/md";

import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { LoadableUser } from "~app/components/app/loadable-user";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { mutations } from "~app/mutations";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { getReceiptDebtName } from "~app/utils/receipt";
import { Text } from "~components";
import type { UsersId } from "~web/db/models";

export const isDebtInSyncWithReceipt = (
	receiptDebt: Pick<LockedReceipt, "currencyCode" | "issued" | "id"> & {
		participantSum: number;
	},
	debt: Pick<
		NonNullable<DebtParticipant["currentDebt"]>,
		"currencyCode" | "amount" | "timestamp" | "receiptId"
	>,
) =>
	receiptDebt.currencyCode === debt.currencyCode &&
	receiptDebt.participantSum === debt.amount &&
	receiptDebt.issued.valueOf() === debt.timestamp.valueOf() &&
	receiptDebt.id === debt.receiptId;

export type DebtParticipant = {
	userId: UsersId;
	sum: number;
	currentDebt?: TRPCQueryOutput<"debts.get">;
};

export type LockedReceipt = Omit<
	TRPCQueryOutput<"receipts.get">,
	"lockedTimestamp"
> & { lockedTimestamp: Date };

type Props = {
	receipt: LockedReceipt;
	participant: DebtParticipant;
};

export const ReceiptParticipantDebt: React.FC<Props> = ({
	receipt,
	participant,
}) => {
	const currency = useFormattedCurrency(receipt.currencyCode);

	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, {
			context: participant.currentDebt
				? {
						userId: participant.userId,
						amount: participant.currentDebt.amount,
						currencyCode: participant.currentDebt.currencyCode,
						receiptId: receipt.id,
				  }
				: {
						userId: participant.userId,
						amount: 0,
						currencyCode: "unknown",
						receiptId: receipt.id,
				  },
		}),
	);
	const updateDebt = React.useCallback(
		(currentDebt: NonNullable<DebtParticipant["currentDebt"]>) =>
			updateMutation.mutate({
				id: currentDebt.id,
				update: {
					amount: participant.sum,
					currencyCode: receipt.currencyCode,
					timestamp: receipt.issued,
					locked: true,
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
		useTrpcMutationOptions(mutations.debts.add.options),
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
								<ReceiptOffIcon
									size={36}
									className="text-danger"
									data-testid="receipt-mismatch-icon"
								/>
							) : null}
							{participant.currentDebt ? (
								<DebtSyncStatus
									debt={{
										lockedTimestamp: participant.currentDebt.lockedTimestamp,
										their: participant.currentDebt.their,
									}}
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
