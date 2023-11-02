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

export type DebtParticipant = {
	userId: UsersId;
	sum: number;
	debt?: TRPCQueryOutput<"debts.get">;
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

	const updateMutation = trpc.receipts.updateDebt.useMutation(
		useTrpcMutationOptions(mutations.receipts.updateDebt.options, {
			context: {
				prevAmount: participant.debt?.amount ?? 0,
				receiptTimestamp: receipt.lockedTimestamp,
			},
		}),
	);
	const updateDebt = React.useCallback(
		(userId: UsersId) =>
			updateMutation.mutate({ receiptId: receipt.id, userId }),
		[updateMutation, receipt.id],
	);

	const showSpacer = useMatchMediaValue(false, { lessMd: true });
	const synced =
		participant.debt?.lockedTimestamp?.valueOf() ===
		receipt.lockedTimestamp.valueOf();

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
						{synced ? null : participant.debt ? (
							<Icon as={ReceiptOffIcon} css={{ color: "$error" }} />
						) : null}
						{participant.debt ? (
							<DebtSyncStatus
								debt={{
									lockedTimestamp: participant.debt.lockedTimestamp,
									their: participant.debt.their,
								}}
								size={SIZE}
							/>
						) : null}
					</>
				)}
			</Grid>
			<Grid defaultCol={1.5} lessMdCol={4}>
				{synced ? null : (
					<IconButton
						title={
							participant.debt?.their
								? "Update debt for user"
								: "Send sync request"
						}
						isLoading={updateMutation.isLoading}
						icon={
							participant.debt?.their ? (
								<SyncIcon size={24} />
							) : (
								<SendIcon size={24} />
							)
						}
						onClick={() => updateDebt(participant.userId)}
					/>
				)}
			</Grid>
		</>
	);
};
