import React from "react";

import type { InfiniteData } from "react-query";

import { Block } from "app/components/utils/block";
import { TRPCQueryOutput } from "app/trpc";

import { ReceiptPreview } from "./receipt-preview";

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
