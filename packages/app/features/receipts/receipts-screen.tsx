import React from "react";
import { trpc } from "../../trpc";
import { InfiniteQueryWrapper } from "../../components/utils/infinite-query-wrapper";
import { Receipts } from "../../components/receipts";
import { AddReceiptForm } from "../../components/add-receipt-form";
import { BackButton } from "../../components/utils/back-button";
import { ScrollView } from "../../utils/styles";
import { DEFAULT_INPUT } from "../../utils/queries/receipts";

export const ReceiptsScreen: React.FC = () => {
	const receiptsQuery = trpc.useInfiniteQuery([
		"receipts.get-paged",
		DEFAULT_INPUT,
	]);

	return (
		<ScrollView>
			<BackButton href="/" />
			<AddReceiptForm input={DEFAULT_INPUT} />
			<InfiniteQueryWrapper query={receiptsQuery}>
				{Receipts}
			</InfiniteQueryWrapper>
		</ScrollView>
	);
};
