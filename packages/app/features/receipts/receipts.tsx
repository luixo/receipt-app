import React from "react";

import { Loading, Spacer, Text, styled, Card } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { QueryErrorMessage } from "app/components/error-message";
import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { Overlay } from "app/components/overlay";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import { useSyncParsedQueryParam } from "app/hooks/use-sync-parsed-query-param";
import { trpc, TRPCQueryInput, TRPCQueryOutput } from "app/trpc";

import { ReceiptPreview } from "./receipt-preview";
import { ReceiptsPagination } from "./receipts-pagination";

const Wrapper = styled("div", {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
});

const NoReceiptsHint = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type PreviewsProps = {
	receipts: TRPCQueryOutput<"receipts.getPaged">["items"];
};

const ReceiptPreviewsList: React.FC<PreviewsProps> = ({ receipts }) => (
	<Grid.Container gap={2}>
		<Grid defaultCol={7.5}>Receipt</Grid>
		<Grid defaultCol={1.5} justify="center">
			Res.
		</Grid>
		<Grid defaultCol={1.5} justify="center">
			Lck.
		</Grid>
		<Grid defaultCol={1.5} justify="center">
			Wait.
		</Grid>
		<Card.Divider />
		{receipts.map((receipt) => (
			<ReceiptPreview key={receipt.id} receipt={receipt} />
		))}
	</Grid.Container>
);

type Input = TRPCQueryInput<"receipts.getPaged">;

const useReceiptQuery = (
	input: Omit<Input, "cursor">,
	cursor: Input["cursor"]
) =>
	trpc.receipts.getPaged.useQuery(
		{ ...input, cursor },
		{ keepPreviousData: true }
	);

export const Receipts: React.FC = () => {
	const [input] = cache.receipts.getPaged.useStore();
	const cursorPaging = useCursorPaging(useReceiptQuery, input, "offset");
	useSyncParsedQueryParam<typeof input.onlyNonResolved>(
		"non-resolved",
		cache.receipts.getPaged.onlyNonResolvedOptions,
		input.onlyNonResolved
	);
	useSyncParsedQueryParam<typeof input.orderBy>(
		"sort",
		cache.receipts.getPaged.orderByOptions,
		input.orderBy
	);
	const { totalCount, isLoading, query, pagination } = cursorPaging;

	if (!totalCount && !input.onlyNonResolved) {
		return (
			<Wrapper>
				<Text h2>You have no receipts</Text>
				<Spacer y={0.5} />
				<NoReceiptsHint h3>
					Press
					<Spacer x={0.5} />
					<IconButton
						href="/receipts/add"
						title="Add receipt"
						bordered
						icon={<AddIcon size={24} />}
					/>
					<Spacer x={0.5} />
					to add a receipt
				</NoReceiptsHint>
			</Wrapper>
		);
	}

	const paginationElement = <ReceiptsPagination pagination={pagination} />;

	return (
		<>
			{paginationElement}
			<Spacer y={1} />
			<Overlay overlay={isLoading ? <Loading size="xl" /> : undefined}>
				{query.status === "error" ? <QueryErrorMessage query={query} /> : null}
				{!totalCount ? (
					<Wrapper>
						<Text h2>All receipts are resolved!</Text>
					</Wrapper>
				) : query.status === "loading" ? (
					<Loading size="xl" />
				) : query.data ? (
					<ReceiptPreviewsList receipts={query.data.items} />
				) : null}
			</Overlay>
			<Spacer y={1} />
			{paginationElement}
		</>
	);
};
