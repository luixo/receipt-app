import React from "react";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text } from "../utils/styles";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];
type ReceiptItemPart = ReceiptItem["parts"][number];

type Props = {
	receiptParticipants: ReceiptParticipant[];
	receiptItemPart: ReceiptItemPart;
};

export const ReceiptItemPart: React.FC<Props> = ({
	receiptItemPart,
	receiptParticipants,
}) => {
	const matchedParticipant = receiptParticipants.find(
		(participant) => participant.userId === receiptItemPart.userId
	);
	if (!matchedParticipant) {
		return (
			<Block name="Unknown user">
				<Text>{receiptItemPart.userId} not found</Text>
			</Block>
		);
	}
	return (
		<Block name={matchedParticipant.name}>
			<Text>{receiptItemPart.part} part(s)</Text>
		</Block>
	);
};
