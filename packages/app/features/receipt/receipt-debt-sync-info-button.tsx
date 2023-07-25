import React from "react";

import { Modal, styled, Text } from "@nextui-org/react";
import { MdInfo as InfoIcon } from "react-icons/md";

import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { CurrencyCode } from "app/utils/currency";
import { getParticipantSums } from "app/utils/receipt-item";
import { ReceiptsId } from "next-app/db/models";

import { ReceiptParticipantDebt } from "./receipt-participant-debt";

const GridHeader = styled(Grid, {
	pb: "$4",

	variants: {
		border: {
			true: {
				borderBottomColor: "$accents5",
				borderBottomStyle: "solid",
				borderBottomWidth: 1,
			},
		},
	},
});

type Participant = TRPCQueryOutput<"debts.getReceipt">[number];

const sortParticipants = (a: Participant, b: Participant): number => {
	if (b.syncStatus.type === a.syncStatus.type) {
		return Number(b.synced) - Number(a.synced);
	}
	if (b.syncStatus.type === "no-parts") {
		return -1;
	}
	if (a.syncStatus.type === "no-parts") {
		return 1;
	}
	if (b.syncStatus.type === "sync") {
		return -1;
	}
	if (a.syncStatus.type === "sync") {
		return 1;
	}
	return Number(b.synced) - Number(a.synced);
};

type Props = {
	receiptId: ReceiptsId;
	receiptTimestamp: Date;
	currencyCode: CurrencyCode;
	participants: Participant[];
};

export const ReceiptDebtSyncInfoButton: React.FC<Props> = ({
	receiptId,
	receiptTimestamp,
	currencyCode,
	participants,
}) => {
	const [popoverOpen, { setFalse: closeModal, setTrue: openModal }] =
		useBooleanState();

	const receiptItemsQuery = trpc.receiptItems.get.useQuery({ receiptId });
	const participantSums = React.useMemo(() => {
		if (!receiptItemsQuery.data) {
			return [];
		}
		return getParticipantSums(
			receiptId,
			receiptItemsQuery.data.items,
			receiptItemsQuery.data.participants,
		).map((participant) => ({
			userId: participant.remoteUserId,
			sum: participant.sum,
		}));
	}, [receiptItemsQuery.data, receiptId]);
	const showBorder = useMatchMediaValue(true, { lessMd: false });
	const sortedParticipants = React.useMemo(
		() => [...participants].sort(sortParticipants),
		[participants],
	);

	if (sortedParticipants.length === 0) {
		return null;
	}
	return (
		<>
			<IconButton
				onClick={openModal}
				color={popoverOpen ? "secondary" : undefined}
				icon={<InfoIcon size={24} />}
			/>
			<Modal open={popoverOpen} onClose={closeModal} width="90%">
				<Modal.Header>
					<Text h3>Sync status</Text>
				</Modal.Header>
				<Modal.Body>
					<Grid.Container>
						<GridHeader border={showBorder} defaultCol={5.5} lessMdCol={0}>
							User
						</GridHeader>
						<GridHeader border={showBorder} defaultCol={2.5} lessMdCol={4}>
							Amount
						</GridHeader>
						<GridHeader border={showBorder} defaultCol={2.5} lessMdCol={4}>
							Status
						</GridHeader>
						<GridHeader border={showBorder} defaultCol={1.5} lessMdCol={4}>
							Actions
						</GridHeader>
						{sortedParticipants.map((participant) => (
							<ReceiptParticipantDebt
								key={participant.userId}
								receiptId={receiptId}
								receiptTimestamp={receiptTimestamp}
								currencyCode={currencyCode}
								participant={participant}
								sum={
									participantSums.find(
										({ userId }) => participant.userId === userId,
									)?.sum
								}
							/>
						))}
					</Grid.Container>
				</Modal.Body>
			</Modal>
		</>
	);
};
