import React from "react";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { ReceiptItemPart } from "./receipt-item-part";
import { Text } from "../utils/styles";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

type Props = {
	receiptItem: ReceiptItem;
	receiptParticipants: ReceiptParticipant[];
};

export const ReceiptItem: React.FC<Props> = ({
	receiptItem,
	receiptParticipants,
}) => {
	return (
		<Block name={receiptItem.name}>
			<Text>
				<Text>{receiptItem.price}</Text>
				{" x "}
				<Text>{receiptItem.quantity}</Text>
			</Text>
			<Text>{receiptItem.locked ? "locked" : "not locked"}</Text>
			{receiptItem.parts.map((part) => (
				<ReceiptItemPart
					key={part.userId}
					receiptItemPart={part}
					receiptParticipants={receiptParticipants}
				/>
			))}
		</Block>
	);
};
