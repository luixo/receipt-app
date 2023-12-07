import React from "react";

import { Loading, styled } from "@nextui-org/react";
import { Button, Divider, Link, Spacer } from "@nextui-org/react-tailwind";
import { MdAdd as AddIcon } from "react-icons/md";

import { Text } from "app/components/base/text";
import { QueryErrorMessage } from "app/components/error-message";
import { Grid } from "app/components/grid";
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
			<Divider />
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
				<Text className="text-4xl font-medium">You have no receipts</Text>
				<Spacer y={2} />
				<Text className="text-center text-2xl font-medium">
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
				</Text>
			</Wrapper>
		);
	}

	const paginationElement = <ReceiptsPagination pagination={pagination} />;

	return (
		<>
			{paginationElement}
			<Spacer y={4} />
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
						<Text className="text-4xl font-medium">
							No receipts under given filters
						</Text>
					</Wrapper>
				) : query.data ? (
					<ReceiptPreviewsList receipts={query.data.items} />
				) : null}
			</Overlay>
			<Spacer y={4} />
			{paginationElement}
		</>
	);
};
