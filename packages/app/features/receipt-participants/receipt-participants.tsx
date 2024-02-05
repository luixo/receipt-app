import React from "react";
import { View } from "react-native";

import { Accordion, AccordionItem } from "@nextui-org/react";
import { FaUser as UserIcon } from "react-icons/fa";

import { Text } from "app/components/base/text";
import type { TRPCQueryOutput } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import {
	getDecimalsPower,
	getItemCalculations,
	getParticipantSums,
} from "app/utils/receipt-item";
import { nonNullishGuard } from "app/utils/utils";
import type { ReceiptsId, UsersId } from "next-app/db/models";

import { AddReceiptParticipantForm } from "./add-receipt-participant-form";
import { ReceiptParticipant } from "./receipt-participant";

type Participant = TRPCQueryOutput<"receiptItems.get">["participants"][number];

const getSortParticipants = () => (a: Participant, b: Participant) => {
	// Sort first by owner
	if (a.role === "owner") {
		return 1;
	}
	if (b.role === "owner") {
		return 1;
	}
	// Sort everyone else by name
	return a.name.localeCompare(b.name);
};

type Props = {
	data: TRPCQueryOutput<"receiptItems.get">;
	receiptId: ReceiptsId;
	receiptSelfUserId?: UsersId;
	receiptLocked: boolean;
	receiptInTransfer: boolean;
	currencyCode?: CurrencyCode;
	isLoading: boolean;
};

export const ReceiptParticipants: React.FC<Props> = ({
	data,
	receiptLocked,
	receiptInTransfer,
	receiptSelfUserId,
	currencyCode,
	receiptId,
	isLoading,
}) => {
	const sortParticipants = React.useMemo(() => getSortParticipants(), []);
	const participants = React.useMemo(() => {
		const decimalsPower = getDecimalsPower();
		const items = data.items.map((item) => ({
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
		return getParticipantSums(receiptId, data.items, data.participants)
			.sort(sortParticipants)
			.map((participant) => ({
				...participant,
				items: items
					.map((item) => {
						const sum =
							item.calculations.sumFlooredByParticipant[
								participant.remoteUserId
							];
						if (!sum) {
							return null;
						}
						return {
							sum: sum / decimalsPower,
							hasExtra: Boolean(
								item.calculations.shortageByParticipant[
									participant.remoteUserId
								],
							),
							id: item.id,
							name: item.name,
						};
					})
					.filter(nonNullishGuard),
			}));
	}, [data, receiptId, sortParticipants]);
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
				{participants.map((participant) => (
					<ReceiptParticipant
						key={participant.remoteUserId}
						receiptId={receiptId}
						receiptLocked={receiptLocked}
						receiptSelfUserId={receiptSelfUserId}
						participant={participant}
						role={data.role}
						currencyCode={currencyCode}
						isLoading={isLoading}
					/>
				))}
				{data.role !== "owner" ? null : (
					<AddReceiptParticipantForm
						className="my-4"
						disabled={isLoading}
						receiptId={receiptId}
						receiptLocked={receiptLocked}
						receiptInTransfer={receiptInTransfer}
						filterIds={participants.map(
							(participant) => participant.remoteUserId,
						)}
					/>
				)}
			</AccordionItem>
		</Accordion>
	);
};
