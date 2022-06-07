import React from "react";
import * as ReactNative from "react-native";
import { createParam } from "solito";
import { styled } from "app/styles";
import { trpc, TRPCQueryResult } from "../../trpc";
import { ReceiptItem } from "../../components/receipt-item";
import { TextLink } from "solito/link";
import { useSx } from "dripsy";

const Wrapper = styled(ReactNative.ScrollView)({
	flex: 1,
});

const BlockWrapper = styled(ReactNative.View)({
	flex: 1,
});

const Text = styled(ReactNative.Text)({
	textAlign: "center",
	mb: 16,
	fontWeight: "bold",
});

type InnerProps = {
	query: TRPCQueryResult<"receipts.items">;
};

const ReceiptsScreenInner: React.FC<InnerProps> = ({ query }) => {
	switch (query.status) {
		case "error":
			return (
				<BlockWrapper>
					<Text>error: {String(query.error)}</Text>
				</BlockWrapper>
			);
		case "loading":
		case "idle":
			return (
				<BlockWrapper>
					<Text>{query.status}</Text>
				</BlockWrapper>
			);
		case "success":
			return (
				<BlockWrapper>
					<Text>Total: {query.data.length} items</Text>
					{query.data.map((receiptItem) => (
						<ReceiptItem key={receiptItem.id} receiptItem={receiptItem} />
					))}
				</BlockWrapper>
			);
	}
};

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: React.FC = () => {
	const sx = useSx();
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const itemsQuery = trpc.useQuery([
		"receipts.items",
		{ offset: 0, limit: 10, id },
	]);

	return (
		<Wrapper
			contentContainerStyle={sx({
				justifyContent: "center",
				alignItems: "center",
				flexGrow: 1,
			})}
		>
			<Text>{`Receipt ID: ${id}`}</Text>
			<TextLink href="/receipts/">Back</TextLink>
			<ReceiptsScreenInner query={itemsQuery} />
		</Wrapper>
	);
};
