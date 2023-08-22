import React from "react";

import { Card, Loading, Spacer, Text, styled } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { QueryErrorMessage } from "app/components/error-message";
import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { Overlay } from "app/components/overlay";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { useTrpcQueryOptions } from "app/hooks/use-trpc-query-options";
import { queries } from "app/queries";
import type { TRPCQueryInput, TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

import { ReceiptPreview, getWidths } from "./receipt-preview";
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

const ReceiptPreviewsList: React.FC<PreviewsProps> = ({ receipts }) => {
	const overflow = useMatchMediaValue(false, { lessSm: true });
	const [nameWidth, sumWidth] = getWidths(overflow);
	return (
		<Grid.Container gap={2}>
			<Grid defaultCol={nameWidth}>Receipt</Grid>
			<Grid defaultCol={sumWidth} justify="flex-end">
				Sum
			</Grid>
			<Card.Divider />
			{receipts.map((receipt) => (
				<ReceiptPreview key={receipt.id} receipt={receipt} />
			))}
		</Grid.Container>
	);
};

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
			<Overlay
				overlay={
					query.fetchStatus === "fetching" && query.isPreviousData ? (
						<Loading size="xl" />
					) : undefined
				}
			>
				{query.status === "error" ? <QueryErrorMessage query={query} /> : null}
				{query.status === "loading" ? (
					<Loading size="xl" />
				) : !totalCount && input.filters ? (
					<Wrapper>
						<Text h2>No receipts under given filters</Text>
					</Wrapper>
				) : query.data ? (
					<ReceiptPreviewsList receipts={query.data.items} />
				) : null}
			</Overlay>
			<Spacer y={1} />
			{paginationElement}
		</>
	);
};
