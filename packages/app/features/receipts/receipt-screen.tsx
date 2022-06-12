import React from "react";
import { createParam } from "solito";
import { trpc } from "../../trpc";
import { Receipt } from "../../components/receipt";
import { QueryWrapper } from "../../components/utils/query-wrapper";
import { ReceiptItems } from "../../components/receipt-items";
import { Block } from "../../components/utils/block";
import { BackButton } from "../../components/utils/back-button";
import { ScrollView } from "../../utils/styles";
import { DEFAULT_INPUT } from "../../utils/queries/receipts";
import { ReceiptItemsGetInput } from "../../utils/queries/receipt-items";

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const receiptItemsInput: ReceiptItemsGetInput = { receiptId: id };
	const receiptQuery = trpc.useQuery(["receipts.get", { id }]);
	const receiptItemsQuery = trpc.useQuery([
		"receipt-items.get",
		receiptItemsInput,
	]);

	return (
		<ScrollView>
			<Block
				name={`Receipt: ${receiptQuery.data ? receiptQuery.data.name : id}`}
			>
				<BackButton href="/receipts/" />
				<QueryWrapper query={receiptQuery} input={DEFAULT_INPUT}>
					{Receipt}
				</QueryWrapper>
				<QueryWrapper
					query={receiptItemsQuery}
					receiptItemsInput={receiptItemsInput}
					role={receiptQuery.data?.role}
				>
					{ReceiptItems}
				</QueryWrapper>
			</Block>
		</ScrollView>
	);
};
