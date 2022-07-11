import React from "react";

import { AddReceiptForm } from "../../components/add-receipt-form";
import { Receipts } from "../../components/receipts";
import { BackButton } from "../../components/utils/back-button";
import { InfiniteQueryWrapper } from "../../components/utils/infinite-query-wrapper";
import { trpc } from "../../trpc";
import { DEFAULT_INPUT } from "../../utils/queries/receipts-get-paged";
import { ScrollView } from "../../utils/styles";

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
