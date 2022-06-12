import React from "react";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">[number];

type Props = {
	receiptItem: ReceiptItem;
};

export const ReceiptItem: React.FC<Props> = ({ receiptItem }) => {
	return (
		<Block name={receiptItem.name}>
			<Text>
				<Text>{receiptItem.price}</Text>
				{" x "}
				<Text>{receiptItem.quantity}</Text>
			</Text>
			<Text>{receiptItem.locked ? "locked" : "not locked"}</Text>
		</Block>
	);
};
