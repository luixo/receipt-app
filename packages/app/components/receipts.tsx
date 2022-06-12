import React from "react";
import { InfiniteData } from "react-query";
import { TRPCQueryOutput } from "../trpc";
import { ReceiptPreview } from "./receipt-preview";
import { Block } from "./utils/block";

type InnerProps = {
	data: InfiniteData<TRPCQueryOutput<"receipts.get-paged">>;
};

export const Receipts: React.FC<InnerProps> = ({ data }) => {
	const allReceipts = data.pages.reduce((acc, page) => [...acc, ...page], []);
	return (
		<Block name={`Total: ${allReceipts.length} receipts`}>
			{allReceipts.map((receipt) => (
				<ReceiptPreview key={receipt.id} data={receipt} />
			))}
		</Block>
	);
};
