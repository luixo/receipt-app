import React from "react";
import { trpc } from "../../trpc";
import { InfiniteQueryWrapper } from "../../components/utils/infinite-query-wrapper";
import { Receipts } from "../../components/receipts";
import { BackButton } from "../../components/utils/back-button";
import { ScrollView } from "../../utils/styles";

const RECEIPTS_PER_PAGE = 10;

export const ReceiptsScreen: React.FC = () => {
	const receiptsQuery = trpc.useInfiniteQuery([
		"receipts.get-paged",
		{ limit: RECEIPTS_PER_PAGE, orderBy: "date-desc" },
	]);

	return (
		<ScrollView>
			<BackButton href="/" />
			<InfiniteQueryWrapper query={receiptsQuery}>
				{Receipts}
			</InfiniteQueryWrapper>
		</ScrollView>
	);
};
