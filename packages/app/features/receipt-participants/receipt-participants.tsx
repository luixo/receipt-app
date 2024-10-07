import React from "react";
import { View } from "react-native";

import { isNonNullish } from "remeda";

import type { TRPCQueryOutput } from "~app/trpc";
import {
	getDecimalsPower,
	getItemCalculations,
	getParticipantSums,
} from "~app/utils/receipt-item";
import { Accordion, AccordionItem } from "~components/accordion";
import { UserIcon } from "~components/icons";
import { Text } from "~components/text";

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
	// Sort everyone else by createdAt timestamp
	return a.createdAt.valueOf() - b.createdAt.valueOf();
};

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptParticipants: React.FC<Props> = ({
	receipt,
	isLoading,
}) => {
	const sortParticipants = React.useMemo(() => getSortParticipants(), []);
	const calculatedParticipants = React.useMemo(() => {
		const decimalsPower = getDecimalsPower();
		const calculatedItems = receipt.items.map((item) => ({
			calculations: getItemCalculations(
				item.price * item.quantity,
				item.parts.reduce(
					(acc, { userId, part }) => ({ ...acc, [userId]: part }),
					{},
				),
			),
			id: item.id,
			name: item.name,
		}));
		return getParticipantSums(receipt.id, receipt.items, receipt.participants)
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
					.filter(isNonNullish),
			}));
	}, [receipt.id, receipt.items, receipt.participants, sortParticipants]);
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
						participant={participant}
						receipt={receipt}
						isLoading={isLoading}
					/>
				))}
				{receipt.ownerUserId === receipt.selfUserId ? (
					<AddReceiptParticipantForm
						className="my-4"
						disabled={isLoading}
						receipt={receipt}
						filterIds={calculatedParticipants.map(
							(participant) => participant.userId,
						)}
					/>
				) : null}
			</AccordionItem>
		</Accordion>
	);
};
