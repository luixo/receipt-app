import React from "react";

import { BackButton } from "app/components/back-button";
import { InfiniteQueryWrapper } from "app/components/infinite-query-wrapper";
import { trpc } from "app/trpc";
import {
	DEFAULT_INPUT,
	receiptsGetPagedNextPage,
} from "app/utils/queries/receipts-get-paged";
import { ScrollView } from "app/utils/styles";

import { AddReceiptForm } from "./add-receipt-form";
import { Receipts } from "./receipts";

export const ReceiptsScreen: React.FC = () => {
	const receiptsQuery = trpc.useInfiniteQuery(
		["receipts.get-paged", DEFAULT_INPUT],
		{
			getNextPageParam: receiptsGetPagedNextPage,
		}
	);

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
