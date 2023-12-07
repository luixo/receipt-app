import React from "react";
import { View } from "react-native";

import {
	Divider,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
} from "@nextui-org/react-tailwind";

import { Text } from "app/components/base/text";

import type {
	DebtParticipant,
	LockedReceipt,
} from "./receipt-participant-debt";
import { ReceiptParticipantDebt } from "./receipt-participant-debt";

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
	isOpen: boolean;
	switchModalOpen: () => void;
	receipt: LockedReceipt;
	participants: DebtParticipant[];
};

export const ReceiptDebtSyncInfoModal: React.FC<Props> = ({
	isOpen,
	switchModalOpen,
	receipt,
	participants,
}) => {
	const sortedParticipants = React.useMemo(
		() => [...participants].sort(sortParticipants(receipt.lockedTimestamp)),
		[participants, receipt.lockedTimestamp],
	);

	if (sortedParticipants.length === 0) {
		return null;
	}
	return (
		<Modal
			isOpen={isOpen}
			onOpenChange={switchModalOpen}
			className="max-w-3xl"
			title="Receipt sync status"
		>
			<ModalContent>
				<ModalHeader>
					<Text className="text-center text-2xl">Sync status</Text>
				</ModalHeader>
				<ModalBody>
					<View className="flex-row gap-4">
						<View className="flex-[4] max-md:hidden">User</View>
						<View className="flex-[2] max-md:flex-1">Amount</View>
						<View className="flex-[2] max-md:flex-1">Status</View>
						<View className="flex-1">Actions</View>
					</View>
					<Divider className="max-md:hidden" />
					{sortedParticipants.map((participant) => (
						<ReceiptParticipantDebt
							key={participant.userId}
							receipt={receipt}
							participant={participant}
						/>
					))}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
};
