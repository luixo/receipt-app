import React from "react";
import { View } from "react-native";

import {
	Divider,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
} from "@nextui-org/react";

import { Text } from "app/components/base/text";

import type {
	DebtParticipant,
	LockedReceipt,
} from "./receipt-participant-debt";
import {
	ReceiptParticipantDebt,
	isDebtInSyncWithReceipt,
} from "./receipt-participant-debt";

const sortParticipantsSameBlock = (
	a: DebtParticipant,
	b: DebtParticipant,
): number => {
	if (a.sum === b.sum) {
		return b.userId.localeCompare(a.userId);
	}
	return b.sum - a.sum;
};

type ReceiptPart = Pick<LockedReceipt, "currencyCode" | "issued" | "id">;

const isEmpty = ({ sum }: DebtParticipant) => sum === 0;
const noDebt = ({ sum, currentDebt }: DebtParticipant) =>
	sum !== 0 && !currentDebt;
const isDesynced =
	(receipt: ReceiptPart) =>
	({ currentDebt, sum }: DebtParticipant) =>
		currentDebt
			? sum !== 0 &&
			  !isDebtInSyncWithReceipt(
					{ ...receipt, participantSum: sum },
					currentDebt,
			  )
			: false;
const isSynced =
	(receipt: ReceiptPart) =>
	({ currentDebt, sum }: DebtParticipant) =>
		currentDebt
			? sum !== 0 &&
			  isDebtInSyncWithReceipt(
					{ ...receipt, participantSum: sum },
					currentDebt,
			  )
			: false;

type SortFn = (a: DebtParticipant, b: DebtParticipant) => number;
const sortBy =
	(...sorters: ((participant: DebtParticipant) => boolean)[]): SortFn =>
	(a, b) => {
		const aIndex = sorters.findIndex((sorter) => sorter(a));
		const bIndex = sorters.findIndex((sorter) => sorter(b));
		if (aIndex === bIndex) {
			return sortParticipantsSameBlock(a, b);
		}
		return aIndex - bIndex;
	};

const sortParticipants = (receipt: ReceiptPart): SortFn =>
	sortBy(noDebt, isDesynced(receipt), isSynced(receipt), isEmpty);

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
		() =>
			[...participants].sort(
				sortParticipants({
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					id: receipt.id,
				}),
			),
		[participants, receipt.currencyCode, receipt.issued, receipt.id],
	);
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
