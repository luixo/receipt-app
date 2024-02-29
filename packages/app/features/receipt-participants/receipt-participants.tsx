import React from "react";
import { View } from "react-native";

import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import {
	getDecimalsPower,
	getItemCalculations,
	getParticipantSums,
} from "~app/utils/receipt-item";
import { Accordion, AccordionItem, Text } from "~components";
import { UserIcon } from "~components/icons";
import { nonNullishGuard } from "~utils";
import type { ReceiptsId, UsersId } from "~web/db/models";

import { AddReceiptParticipantForm } from "./add-receipt-participant-form";
import { ReceiptParticipant } from "./receipt-participant";

type Participant = TRPCQueryOutput<"receipts.get">["participants"][number];

const getSortParticipants = () => (a: Participant, b: Participant) => {
	// Sort first by owner
	if (a.role === "owner") {
		return 1;
	}
	if (b.role === "owner") {
		return 1;
	}
	// Sort everyone else by added timestamp
	return a.added.valueOf() - b.added.valueOf();
};

type Props = {
	items: TRPCQueryOutput<"receipts.get">["items"];
	participants: TRPCQueryOutput<"receipts.get">["participants"];
	receiptId: ReceiptsId;
	receiptSelfUserId: UsersId;
	receiptLocked: boolean;
	receiptInTransfer: boolean;
	currencyCode: CurrencyCode;
	isOwner: boolean;
	isLoading: boolean;
};

export const ReceiptParticipants: React.FC<Props> = ({
	items,
	participants,
	receiptLocked,
	receiptInTransfer,
	receiptSelfUserId,
	currencyCode,
	receiptId,
	isOwner,
	isLoading,
}) => {
	const sortParticipants = React.useMemo(() => getSortParticipants(), []);
	const calculatedParticipants = React.useMemo(() => {
		const decimalsPower = getDecimalsPower();
		const calculatedItems = items.map((item) => ({
			calculations: getItemCalculations<UsersId>(
				item.price * item.quantity,
				item.parts.reduce(
					(acc, { userId, part }) => ({ ...acc, [userId]: part }),
					{},
				),
			),
			id: item.id,
			name: item.name,
		}));
		return getParticipantSums(receiptId, items, participants)
			.sort(sortParticipants)
			.map((participant) => ({
				...participant,
				items: calculatedItems
					.map((item) => {
						const sum =
							item.calculations.sumFlooredByParticipant[participant.userId];
						if (!sum) {
							return null;
						}
						return {
							sum: sum / decimalsPower,
							hasExtra: Boolean(
								item.calculations.shortageByParticipant[participant.userId],
							),
							id: item.id,
							name: item.name,
						};
					})
					.filter(nonNullishGuard),
			}));
	}, [receiptId, items, participants, sortParticipants]);
	return (
		<Accordion variant="shadow">
			<AccordionItem
				key="participants"
				title={
					<View className="flex-row gap-2">
						<UserIcon size={24} />
						<Text className="text-xl">Participants</Text>
					</View>
				}
				textValue="Participants"
			>
				{calculatedParticipants.map((participant) => (
					<ReceiptParticipant
						key={participant.userId}
						receiptId={receiptId}
						receiptLocked={receiptLocked}
						receiptSelfUserId={receiptSelfUserId}
						participant={participant}
						isOwner={isOwner}
						currencyCode={currencyCode}
						isLoading={isLoading}
					/>
				))}
				{!isOwner ? null : (
					<AddReceiptParticipantForm
						className="my-4"
						disabled={isLoading}
						receiptId={receiptId}
						receiptLocked={receiptLocked}
						receiptInTransfer={receiptInTransfer}
						filterIds={calculatedParticipants.map(
							(participant) => participant.userId,
						)}
					/>
				)}
			</AccordionItem>
		</Accordion>
	);
};
