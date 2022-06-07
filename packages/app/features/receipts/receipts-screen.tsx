import React from "react";
import * as ReactNative from "react-native";
import { styled, Text as BaseText } from "app/styles";
import { trpc, TRPCQueryResult } from "../../trpc";
import { Receipt } from "../../components/receipt";
import { useSx } from "dripsy";

const Wrapper = styled(ReactNative.ScrollView)({
	flex: 1,
});

const BlockWrapper = styled(ReactNative.View)({
	flex: 1,
	alignItems: "center",
});

const Text = styled(BaseText)({
	textAlign: "center",
	marginBottom: "$m",
	fontWeight: "$bold",
});

type InnerProps = {
	query: TRPCQueryResult<"receipts.previews">;
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
					<Text>Total: {query.data.length} receipts</Text>
					{query.data.map((receipt) => (
						<Receipt key={receipt.id} receipt={receipt} />
					))}
				</BlockWrapper>
			);
	}
};

export const ReceiptsScreen: React.FC = () => {
	const sx = useSx();
	const receiptsQuery = trpc.useQuery([
		"receipts.previews",
		{ offset: 0, limit: 10 },
	]);

	return (
		<Wrapper
			contentContainerStyle={sx({
				justifyContent: "center",
				alignItems: "center",
				width: "$full",
			})}
		>
			<ReceiptsScreenInner query={receiptsQuery} />
		</Wrapper>
	);
};
