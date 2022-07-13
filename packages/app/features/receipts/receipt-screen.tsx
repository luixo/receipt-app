import React from "react";

import { createParam } from "solito";

import { Receipt } from "app/components/receipt";
import { ReceiptItems } from "app/components/receipt-items";
import { BackButton } from "app/components/utils/back-button";
import { Block } from "app/components/utils/block";
import { QueryWrapper } from "app/components/utils/query-wrapper";
import { trpc } from "app/trpc";
import { ReceiptItemsGetInput } from "app/utils/queries/receipt-items";
import { ReceiptsGetInput } from "app/utils/queries/receipts-get";
import { DEFAULT_INPUT } from "app/utils/queries/receipts-get-paged";
import { ScrollView } from "app/utils/styles";

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const receiptItemsInput: ReceiptItemsGetInput = { receiptId: id };
	const receiptInput: ReceiptsGetInput = { id };
	const receiptQuery = trpc.useQuery(["receipts.get", receiptInput]);
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
				<QueryWrapper
					query={receiptQuery}
					pagedInput={DEFAULT_INPUT}
					input={receiptInput}
				>
					{Receipt}
				</QueryWrapper>
				<QueryWrapper
					query={receiptItemsQuery}
					receiptItemsInput={receiptItemsInput}
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
