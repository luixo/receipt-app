import React from "react";

import { createParam } from "solito";

import { BackButton } from "app/components/back-button";
import { Block } from "app/components/block";
import { QueryWrapper } from "app/components/query-wrapper";
import { ReceiptItems } from "app/features/receipt-items/receipt-items-screen";
import { trpc } from "app/trpc";
import { ScrollView } from "app/utils/styles";

import { Receipt } from "./receipt";

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const receiptNameQuery = trpc.useQuery(["receipts.get-name", { id }]);
	const receiptQuery = trpc.useQuery(["receipts.get", { id }]);
	const receiptItemsQuery = trpc.useQuery([
		"receipt-items.get",
		{ receiptId: id },
	]);

	return (
		<ScrollView>
			<Block name={`Receipt: ${receiptNameQuery.data || id}`}>
				<BackButton href="/receipts/" />
				<QueryWrapper query={receiptQuery}>{Receipt}</QueryWrapper>
				<QueryWrapper
					query={receiptItemsQuery}
					role={receiptQuery.data?.role}
					currency={receiptQuery.data?.currency}
					receiptId={id}
				>
					{ReceiptItems}
				</QueryWrapper>
			</Block>
		</ScrollView>
	);
};
