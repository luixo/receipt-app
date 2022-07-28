import React from "react";

import {
	Container,
	Loading,
	Spacer,
	Text,
	Button,
	styled,
	Grid,
} from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { Overlay } from "app/components/overlay";
import { QueryErrorMessage } from "app/components/query-error-message";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import {
	trpc,
	TRPCInfiniteQuerySuccessResult,
	TRPCQueryOutput,
} from "app/trpc";

import { ReceiptPreview } from "./receipt-preview";

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
		<GridHeaderColumn xs={7.5}>Receipt</GridHeaderColumn>
		<GridHeaderColumn xs={1.5} centered>
			Res.
		</GridHeaderColumn>
		<GridHeaderColumn xs={1.5} centered>
			Acc.
		</GridHeaderColumn>
		<GridHeaderColumn xs={1.5} centered>
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
	const [input] = cache.receipts.getPaged.useStore();
	const {
		onNextPage,
		onPrevPage,
		selectedPageIndex,
		selectedPage,
		prevSelectedPage,
		isLoading,
		prevDisabled,
		prevLoading,
		nextDisabled,
		nextLoading,
		totalCount,
	} = useCursorPaging(query);

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
						href="/users/add"
						title="Add user"
						bordered
						icon={<AddIcon size={24} />}
						linkStyle={{ display: "inline-flex" }}
					/>
					<Spacer x={0.5} />
					to add a receipt
				</NoReceiptsHint>
			</Container>
		);
	}

	const pagination = (
		<Container display="flex" justify="center">
			<Button.Group size="sm">
				<Button
					onClick={prevLoading ? undefined : onPrevPage}
					disabled={prevDisabled}
				>
					{"<"}
				</Button>
				<Button>
					Page {selectedPageIndex + 1} of{" "}
					{totalCount ? Math.ceil(totalCount / input.limit) : "unknown"}
				</Button>
				<Button
					onClick={nextLoading ? undefined : onNextPage}
					disabled={nextDisabled}
				>
					{nextLoading ? <Loading color="currentColor" size="xs" /> : ">"}
				</Button>
			</Button.Group>
		</Container>
	);

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
