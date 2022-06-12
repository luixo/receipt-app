import React from "react";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { Text, TextLink } from "../utils/styles";

type Props = {
	data: TRPCQueryOutput<"receipts.get-paged">[number];
};

export const ReceiptPreview: React.FC<Props> = ({ data: receipt }) => {
	return (
		<Block>
			<TextLink href={`/receipts/${receipt.id}/`}>{receipt.name}</TextLink>
			<Text>Role: {receipt.role}</Text>
			<Text>Issued: {receipt.issued.toLocaleDateString()}</Text>
			<Text>Resolved: {receipt.receiptResolved.toString()}</Text>
			<Text>
				Resolved participant:{" "}
				{receipt.participantResolved?.toString() ?? "unknown"}
			</Text>
		</Block>
	);
};
