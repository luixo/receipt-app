import React from "react";

import { Spacer, Text, styled } from "@nextui-org/react";
import {
	MdOutlineReceipt as ReceiptOffIcon,
	MdSend as SendIcon,
	MdSync as SyncIcon,
	MdExposureZero as ZeroIcon,
} from "react-icons/md";

import { DebtSyncStatus } from "app/components/app/debt-sync-status";
import { LoadableUser } from "app/components/app/loadable-user";
import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import { getReceiptDebtName } from "app/utils/receipt";
import type { UsersId } from "next-app/db/models";

const SIZE = 36;

const Icon = styled(ZeroIcon, {
	size: SIZE,
	color: "$accents3",
});

const Border = styled("div", {
	borderBottomColor: "$accents5",
	borderBottomStyle: "solid",
	borderBottomWidth: 1,
	width: "100%",
	my: "$4",
});

const isDebtInSyncWithReceipt = (
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

	const showSpacer = useMatchMediaValue(false, { lessMd: true });
	const { currentDebt } = participant;
	const isReceiptSyncedWithOurDebt = currentDebt
		? isDebtInSyncWithReceipt(
				{ ...receipt, participantSum: participant.sum },
				currentDebt,
		  )
		: false;
	const isUpdating = updateMutation.isLoading || addMutation.isLoading;

	return (
		<>
			<Spacer css={{ width: "100%" }} y={0.5} />
			<Grid defaultCol={5.5} lessMdCol={12} css={{ flexDirection: "column" }}>
				{showSpacer ? <Border /> : null}
				<LoadableUser id={participant.userId} />
				{showSpacer ? <Spacer y={1} /> : null}
			</Grid>
			<Grid defaultCol={2.5} lessMdCol={4} css={{ alignItems: "center" }}>
				<Text>{`${participant.sum} ${currency}`}</Text>
			</Grid>
			<Grid defaultCol={2.5} lessMdCol={4}>
				{participant.sum === 0 ? (
					<Icon as={ZeroIcon} />
				) : (
					<>
						{isReceiptSyncedWithOurDebt ? null : participant.currentDebt ? (
							<Icon as={ReceiptOffIcon} css={{ color: "$error" }} />
						) : null}
						{participant.currentDebt ? (
							<DebtSyncStatus
								debt={{
									lockedTimestamp: participant.currentDebt.lockedTimestamp,
									their: participant.currentDebt.their,
								}}
								size={SIZE}
							/>
						) : null}
					</>
				)}
			</Grid>
			<Grid defaultCol={1.5} lessMdCol={4}>
				{isReceiptSyncedWithOurDebt && !isUpdating ? null : (
					<IconButton
						title={
							participant.currentDebt?.their
								? "Update debt for user"
								: "Send debt to a user"
						}
						isLoading={isUpdating}
						disabled={isUpdating}
						icon={
							participant.currentDebt?.their ? (
								<SyncIcon size={24} />
							) : (
								<SendIcon size={24} />
							)
						}
						onClick={() =>
							participant.currentDebt?.their
								? updateDebt(participant.currentDebt)
								: addDebt()
						}
					/>
				)}
			</Grid>
		</>
	);
};
