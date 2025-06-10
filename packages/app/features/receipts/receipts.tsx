import React from "react";
import { View } from "react-native";

import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import type { TRPCQueryErrorResult, TRPCQueryInput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Overlay } from "~components/overlay";
import { Pagination } from "~components/pagination";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import type { ReceiptsId } from "~db/models";

import { ReceiptPreview, ReceiptPreviewSkeleton } from "./receipt-preview";

type Input = TRPCQueryInput<"receipts.getPaged">;

const ReceiptPreviewsSkeleton: React.FC<{ amount: number }> = ({ amount }) => {
	const elements = React.useMemo(
		() => new Array<null>(amount).fill(null),
		[amount],
	);
	return (
		<>
			{elements.map((_, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<ReceiptPreviewSkeleton key={index} />
			))}
		</>
	);
};

const useReceiptQuery = (
	input: Omit<Input, "cursor">,
	cursor: Input["cursor"],
) => {
	const trpc = useTRPC();
	return useQuery(
		trpc.receipts.getPaged.queryOptions(
			{ ...input, cursor },
			{ placeholderData: keepPreviousData },
		),
	);
};

const ReceiptPreviews: React.FC<{ ids: ReceiptsId[] }> = ({ ids }) => {
	const trpc = useTRPC();
	const receiptQueries = useQueries({
		queries: ids.map((id) => trpc.receipts.get.queryOptions({ id })),
	});
	if (receiptQueries.every((query) => query.status === "pending")) {
		return <ReceiptPreviewsSkeleton amount={receiptQueries.length} />;
	}
	if (receiptQueries.every((query) => query.status === "error")) {
		return (
			<QueryErrorMessage
				query={receiptQueries[0] as TRPCQueryErrorResult<"receipts.get">}
			/>
		);
	}

	return (
		<>
			{receiptQueries.map((receiptQuery, index) => (
				<React.Fragment key={ids[index]}>
					<Divider className="sm:hidden" />
					{receiptQuery.status === "pending" ? (
						<ReceiptPreviewSkeleton />
					) : receiptQuery.status === "error" ? (
						<QueryErrorMessage query={receiptQuery} />
					) : (
						<ReceiptPreview receipt={receiptQuery.data} />
					)}
				</React.Fragment>
			))}
		</>
	);
};

const ReceiptsTableHeader = () => (
	<View className="flex-row gap-2">
		<View className="flex-[8] p-2">
			<Text>Receipt</Text>
		</View>
		<View className="flex-[2] p-2">
			<Text className="self-end">Sum</Text>
		</View>
		<View className="flex-1 p-2 max-sm:hidden" />
	</View>
);

type Props = {
	sort: SearchParamState<"/receipts", "sort">[0];
	filters: SearchParamState<"/receipts", "filters">[0];
	limit: SearchParamState<"/receipts", "limit">[0];
	offsetState: SearchParamState<"/receipts", "offset">;
};

export const Receipts: React.FC<Props> = ({
	filters,
	sort,
	limit,
	offsetState,
}) => {
	const cursorPaging = useCursorPaging(
		useReceiptQuery,
		{ limit, orderBy: sort, filters },
		offsetState,
	);
	const { totalCount, query, pagination } = cursorPaging;

	if (!totalCount && query.fetchStatus !== "fetching") {
		if (query.status === "error") {
			return <QueryErrorMessage query={query} />;
		}
		return (
			<EmptyCard title="You have no receipts">
				Press
				<ButtonLink
					color="primary"
					to="/receipts/add"
					title="Add receipt"
					variant="bordered"
					className="mx-2"
					isIconOnly
				>
					<AddIcon size={24} />
				</ButtonLink>
				to add a receipt
			</EmptyCard>
		);
	}

	const paginationElement =
		!totalCount || (totalCount && totalCount <= limit) ? null : (
			<Pagination
				className="self-center"
				color="primary"
				size="lg"
				variant="bordered"
				{...pagination}
			/>
		);

	return (
		<>
			{paginationElement}
			<Overlay
				className="gap-2"
				overlay={
					query.fetchStatus === "fetching" && query.isPlaceholderData ? (
						<Spinner size="lg" />
					) : undefined
				}
			>
				<ReceiptsTableHeader />
				<Divider className="max-sm:hidden" />
				{query.status === "error" ? (
					<QueryErrorMessage query={query} />
				) : query.status === "pending" ? (
					<ReceiptPreviewsSkeleton amount={limit} />
				) : !totalCount && values(filters).filter(isNonNullish).length === 0 ? (
					<Header className="text-center">
						No receipts under given filters
					</Header>
				) : (
					<ReceiptPreviews ids={query.data.items} />
				)}
			</Overlay>
			{paginationElement}
		</>
	);
};
