import React from "react";

import {
	Container,
	Loading,
	Spacer,
	Text,
	styled,
	Grid,
} from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { QueryErrorMessage } from "app/components/error-message";
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

const GridHeaderColumn = styled(Grid, {
	borderColor: "$border",
	borderBottomStyle: "solid",

	variants: {
		centered: {
			true: {
				justifyContent: "center",
			},
		},
	},
});

type PreviewsProps = {
	receipts: TRPCQueryOutput<"receipts.get-paged">["items"];
};

const ReceiptPreviewsList: React.FC<PreviewsProps> = ({ receipts }) => (
	<Grid.Container gap={2}>
		<GridHeaderColumn xs={8}>Receipt</GridHeaderColumn>
		<GridHeaderColumn xs={2} centered>
			Res.
		</GridHeaderColumn>
		<GridHeaderColumn xs={2} centered>
			Wait.
		</GridHeaderColumn>
		{receipts.map((receipt) => (
			<ReceiptPreview key={receipt.id} receipt={receipt} />
		))}
	</Grid.Container>
);

type InnerProps = {
	query: TRPCInfiniteQuerySuccessResult<"receipts.get-paged">;
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
	const query = trpc.useInfiniteQuery(["receipts.get-paged", input], {
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
