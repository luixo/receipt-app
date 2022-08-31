import React from "react";

import { Spacer, styled, Text } from "@nextui-org/react";
import {
	MdExposureZero as ZeroIcon,
	MdOutlineNoAccounts as NoAccountIcon,
	MdSend as SendIcon,
	MdOutlineReceipt as ReceiptOffIcon,
	MdSync as SyncIcon,
} from "react-icons/md";

import { cache } from "app/cache";
import { DebtSyncStatus } from "app/components/app/debt-sync-status";
import { LoadableUser } from "app/components/app/loadable-user";
import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { ReceiptsId, UsersId } from "next-app/db/models";

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

type Participant = TRPCQueryOutput<"debts.get-receipt">[number];

type Props = {
	receiptId: ReceiptsId;
	currency: Currency;
	participant: Participant;
	sum?: number;
};

export const ReceiptParticipantDebt: React.FC<Props> = ({
	receiptId,
	currency,
	participant,
	sum,
}) => {
	const formattedCurrency = useFormattedCurrency(currency);

	const updateMutation = trpc.useMutation(
		"receipts.update-debt",
		useTrpcMutationOptions(cache.receipts.updateDebt.mutationOptions)
	);
	const updateDebt = React.useCallback(
		(userId: UsersId, updateIntention: boolean) =>
			updateMutation.mutate({ receiptId, userId, updateIntention }),
		[updateMutation, receiptId]
	);

	const showSpacer = useMatchMediaValue(false, { lessMd: true });

	const showUpdateDebt =
		participant.status === "nosync" ||
		(participant.status === "unsync" && !participant.intentionDirection);

	return (
		<>
			<Spacer css={{ width: "100%" }} y={0.5} />
			<Grid defaultCol={5.5} lessMdCol={12} css={{ flexDirection: "column" }}>
				{showSpacer ? <Border /> : null}
				<LoadableUser id={participant.userId} />
				{showSpacer ? <Spacer y={1} /> : null}
			</Grid>
			<Grid defaultCol={2.5} lessMdCol={4} css={{ alignItems: "center" }}>
				<Text>{sum !== undefined ? `${sum} ${formattedCurrency}` : null}</Text>
			</Grid>
			<Grid defaultCol={2.5} lessMdCol={4}>
				{participant.status === "no-parts" ? (
					<Icon as={ZeroIcon} />
				) : participant.status === "no-account" ? (
					<Icon as={NoAccountIcon} />
				) : (
					<>
						{participant.synced ? null : (
							<Icon as={ReceiptOffIcon} css={{ color: "$error" }} />
						)}
						<DebtSyncStatus
							status={participant.status}
							intentionDirection={participant.intentionDirection}
							size={SIZE}
						/>
					</>
				)}
			</Grid>
			<Grid defaultCol={1.5} lessMdCol={4}>
				{showUpdateDebt ? (
					participant.synced ? (
						<IconButton
							title="Send sync request"
							isLoading={updateMutation.isLoading}
							icon={<SendIcon size={24} />}
							onClick={() => updateDebt(participant.userId, true)}
						/>
					) : (
						<IconButton
							title="Update debt for user"
							isLoading={updateMutation.isLoading}
							icon={<SyncIcon size={24} />}
							onClick={() => updateDebt(participant.userId, false)}
						/>
					)
				) : null}
			</Grid>
		</>
	);
};
