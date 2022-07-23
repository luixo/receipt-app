import React from "react";

import { cache } from "app/cache";
import { BackButton } from "app/components/back-button";
import { InfiniteQueryWrapper } from "app/components/infinite-query-wrapper";
import { trpc } from "app/trpc";
import { ScrollView } from "app/utils/styles";

import { AddReceiptForm } from "./add-receipt-form";
import { Receipts } from "./receipts";

export const ReceiptsScreen: React.FC = () => {
	const receiptsQuery = trpc.useInfiniteQuery(
		["receipts.get-paged", cache.receipts.getPaged.useStore()],
		{
			getNextPageParam: cache.receipts.getPaged.getNextPage,
		}
	);

	return (
		<ScrollView>
			<BackButton href="/" />
			<AddReceiptForm />
			<InfiniteQueryWrapper query={receiptsQuery}>
				{Receipts}
			</InfiniteQueryWrapper>
		</ScrollView>
	);
};
