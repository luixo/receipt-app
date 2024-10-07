import type React from "react";
import { View } from "react-native";

import { useParticipants } from "~app/hooks/use-participants";
import type { TRPCQueryOutput } from "~app/trpc";
import { Accordion, AccordionItem } from "~components/accordion";
import { UserIcon } from "~components/icons";
import { Text } from "~components/text";

import { AddReceiptParticipantForm } from "./add-receipt-participant-form";
import { ReceiptParticipant } from "./receipt-participant";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptParticipants: React.FC<Props> = ({
	receipt,
	isLoading,
}) => {
	const { participants } = useParticipants(receipt);
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
						receipt={receipt}
						isLoading={isLoading}
					/>
				))}
				{receipt.ownerUserId === receipt.selfUserId ? (
					<AddReceiptParticipantForm
						className="my-4"
						disabled={isLoading}
						receipt={receipt}
						filterIds={participants.map((participant) => participant.userId)}
					/>
				) : null}
			</AccordionItem>
		</Accordion>
	);
};
