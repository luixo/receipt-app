import React from "react";
import { View } from "react-native";

import { Button, Divider, Link, Pagination, Spinner } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { Header } from "app/components/base/header";
import { Text } from "app/components/base/text";
import { EmptyCard } from "app/components/empty-card";
import { QueryErrorMessage } from "app/components/error-message";
import { Overlay } from "app/components/overlay";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import { useTrpcQueryOptions } from "app/hooks/use-trpc-query-options";
import { queries } from "app/queries";
import type { TRPCQueryInput } from "app/trpc";
import { trpc } from "app/trpc";

import { ReceiptPreview } from "./receipt-preview";

type Input = TRPCQueryInput<"receipts.getPaged">;

const useReceiptQuery = (
	input: Omit<Input, "cursor">,
	cursor: Input["cursor"],
) =>
	trpc.receipts.getPaged.useQuery(
		{ ...input, cursor },
		{
			...useTrpcQueryOptions(queries.receipts.getPaged.options),
			keepPreviousData: true,
		},
	);

export const Receipts: React.FC = () => {
	const [input] = queries.receipts.getPaged.useStore();
	queries.receipts.getPaged.useSyncQueryParams();
	const cursorPaging = useCursorPaging(useReceiptQuery, input, "offset");
	const { totalCount, query, pagination } = cursorPaging;

	if (!totalCount && !input.filters && query.fetchStatus !== "fetching") {
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
					query.fetchStatus === "fetching" && query.isPreviousData ? (
						<Spinner size="lg" />
					) : undefined
				}
			>
				{query.status === "error" ? <QueryErrorMessage query={query} /> : null}
				{query.status === "loading" ? (
					<Spinner size="lg" />
				) : !totalCount && input.filters ? (
					<Header className="text-center">
						No receipts under given filters
					</Header>
				) : query.data ? (
					<>
						<View className="flex-row gap-2">
							<View className="flex-[7] p-2">
								<Text>Receipt</Text>
							</View>
							<View className="flex-[2] p-2">
								<Text className="self-end">Sum</Text>
							</View>
							<View className="flex-[3] p-2 pr-14" />
						</View>
						<Divider className="max-sm:hidden" />
						{query.data.items.map((receipt) => (
							<React.Fragment key={receipt.id}>
								<Divider className="sm:hidden" />
								<ReceiptPreview receipt={receipt} />
							</React.Fragment>
						))}
					</>
				) : null}
			</Overlay>
			{paginationElement}
		</>
	);
};
