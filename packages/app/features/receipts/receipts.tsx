import React from "react";
import { View } from "react-native";

import { keepPreviousData } from "@tanstack/react-query";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import type {
	Filters,
	OrderByLiteral,
} from "~app/features/receipts/receipts-screen";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { TRPCQueryErrorResult, TRPCQueryInput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { AddIcon } from "~components/icons";
import { Link } from "~components/link";
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
) =>
	trpc.receipts.getPaged.useQuery(
		{ ...input, cursor },
		{ placeholderData: keepPreviousData },
	);

const ReceiptPreviews: React.FC<{ ids: ReceiptsId[] }> = ({ ids }) => {
	const receiptQueries = trpc.useQueries((t) =>
		ids.map((id) => t.receipts.get({ id })),
	);
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
	filters: Filters;
	orderBy: OrderByLiteral;
	limit: number;
};

export const Receipts: React.FC<Props> = ({ filters, orderBy, limit }) => {
	const cursorPaging = useCursorPaging(
		useReceiptQuery,
		{ limit, orderBy, filters },
		"offset",
	);
	const { totalCount, query, pagination } = cursorPaging;

	if (!totalCount && query.fetchStatus !== "fetching") {
		if (query.status === "error") {
			return <QueryErrorMessage query={query} />;
		}
		return (
			<EmptyCard title="You have no receipts">
				Press
				<Button
					color="primary"
					as={Link}
					href="/receipts/add"
					title="Add receipt"
					variant="bordered"
					className="mx-2"
					isIconOnly
				>
					<AddIcon size={24} />
				</Button>
				to add a receipt
			</EmptyCard>
		);
	}

	const paginationElement =
		totalCount === 0 ? null : (
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
