import React from "react";

import { Modal, Text, styled } from "@nextui-org/react";
import { MdInfo as InfoIcon } from "react-icons/md";

import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";

import type {
	DebtParticipant,
	LockedReceipt,
} from "./receipt-participant-debt";
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

const sortParticipants =
	(receiptLockedTimestamp: Date) =>
	(a: DebtParticipant, b: DebtParticipant): number => {
		const aLockedTimestamp = a.currentDebt?.their?.lockedTimestamp?.valueOf();
		const bLockedTimestamp = b.currentDebt?.their?.lockedTimestamp?.valueOf();
		if (aLockedTimestamp === bLockedTimestamp) {
			if (a.sum === b.sum) {
				return b.userId.localeCompare(a.userId);
			}
			return b.sum - a.sum;
		}
		if (!aLockedTimestamp) {
			return 1;
		}
		if (!bLockedTimestamp) {
			return -1;
		}
		const receiptLockedTimestampValue = receiptLockedTimestamp.valueOf();
		if (receiptLockedTimestampValue === aLockedTimestamp) {
			return -1;
		}
		if (receiptLockedTimestampValue === bLockedTimestamp) {
			return 1;
		}
		return bLockedTimestamp - aLockedTimestamp;
	};

type Props = {
	receipt: LockedReceipt;
	participants: DebtParticipant[];
};

export const ReceiptDebtSyncInfoButton: React.FC<Props> = ({
	receipt,
	participants,
}) => {
	const [popoverOpen, { setFalse: closeModal, setTrue: openModal }] =
		useBooleanState();

	const showBorder = useMatchMediaValue(true, { lessMd: false });
	const sortedParticipants = React.useMemo(
		() => [...participants].sort(sortParticipants(receipt.lockedTimestamp)),
		[participants, receipt.lockedTimestamp],
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
				title="Show sync status"
			/>
			<Modal
				open={popoverOpen}
				onClose={closeModal}
				width="90%"
				title="Receipt sync status"
			>
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
								receipt={receipt}
								participant={participant}
							/>
						))}
					</Grid.Container>
				</Modal.Body>
			</Modal>
		</>
	);
};
