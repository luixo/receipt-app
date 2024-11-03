import type React from "react";
import { View } from "react-native";

import { Accordion, AccordionItem } from "~components/accordion";
import { UserIcon } from "~components/icons";
import { Text } from "~components/text";

import { AddReceiptParticipantForm } from "./add-receipt-participant-form";
import { useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipant } from "./receipt-participant";

export const ReceiptParticipants: React.FC = () => {
	const { participants } = useReceiptContext();
	const isOwner = useIsOwner();
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
						key={participant.userId}
						participant={participant}
					/>
				))}
				{isOwner ? (
					<AddReceiptParticipantForm
						className="my-4"
						filterIds={participants.map((participant) => participant.userId)}
					/>
				) : null}
			</AccordionItem>
		</Accordion>
	);
};
