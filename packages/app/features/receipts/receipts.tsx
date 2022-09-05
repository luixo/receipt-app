import React from "react";

import {
	Container,
	Loading,
	Spacer,
	Text,
	styled,
	Card,
} from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { QueryErrorMessage } from "app/components/error-message";
import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { Overlay } from "app/components/overlay";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import {
	trpc,
	TRPCInfiniteQuerySuccessResult,
	TRPCQueryOutput,
} from "app/trpc";

import { ReceiptPreview } from "./receipt-preview";
import { ReceiptsPagination } from "./receipts-pagination";

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

type InnerProps = {
	query: TRPCInfiniteQuerySuccessResult<"receipts.getPaged">;
};

const ReceiptsInner: React.FC<InnerProps> = ({ query }) => {
	const cursorPaging = useCursorPaging(query);
	const { totalCount, isLoading, selectedPage, prevSelectedPage } =
		cursorPaging;

	if (totalCount === 0) {
		return (
			<Container
				display="flex"
				direction="column"
				alignItems="center"
				justify="center"
			>
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
			</Container>
		);
	}

	const pagination = <ReceiptsPagination cursorPaging={cursorPaging} />;

	return (
		<>
			{pagination}
			<Spacer y={1} />
			<Overlay overlay={isLoading ? <Loading size="xl" /> : undefined}>
				{selectedPage ? (
					<ReceiptPreviewsList receipts={selectedPage.items} />
				) : prevSelectedPage ? (
					<ReceiptPreviewsList receipts={prevSelectedPage.items} />
				) : null}
			</Overlay>
			<Spacer y={1} />
			{pagination}
		</>
	);
};

export const Receipts: React.FC = () => {
	const [input] = cache.receipts.getPaged.useStore();
	const query = trpc.useInfiniteQuery(["receipts.getPaged", input], {
		getNextPageParam: cache.receipts.getPaged.getNextPage,
		keepPreviousData: true,
	});
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <ReceiptsInner query={query} />;
};
