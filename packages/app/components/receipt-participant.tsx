import React from "react";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text } from "../utils/styles";

type Props = {
	receiptParticipant: TRPCQueryOutput<"receipt-items.get">["participants"][number];
};

export const ReceiptParticipant: React.FC<Props> = ({ receiptParticipant }) => {
	return (
		<Block name={`User ${receiptParticipant.name}`}>
			<Text>Role: {receiptParticipant.role}</Text>
			<Text>{receiptParticipant.resolved ? "resolved" : "not resolved"}</Text>
		</Block>
	);
};
