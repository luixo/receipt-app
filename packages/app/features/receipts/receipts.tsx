import React from "react";

import type { InfiniteData } from "react-query";

import { Block } from "app/components/block";
import { TRPCQueryOutput } from "app/trpc";

import { ReceiptPreview } from "./receipt-preview";

type ReceiptsResult = TRPCQueryOutput<"receipts.get-paged">;

type InnerProps = {
	data: InfiniteData<ReceiptsResult>;
};

export const Receipts: React.FC<InnerProps> = ({ data }) => {
	const allReceipts = data.pages.reduce<ReceiptsResult["items"]>(
		(acc, page) => [...acc, ...page.items],
		[]
	);
	return (
		<Block name={`Total: ${data.pages[0]?.count} receipts`}>
			{allReceipts.map((receipt) => (
				<ReceiptPreview key={receipt.id} data={receipt} />
			))}
		</Block>
	);
};
