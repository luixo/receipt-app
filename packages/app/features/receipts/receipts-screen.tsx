import React from "react";
import * as ReactNative from "react-native";
import { styled } from "app/styles";
import { trpc, TRPCQueryResult } from "../../trpc";
import { Receipt } from "../../components/receipt";

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

const styles = ReactNative.StyleSheet.create({
	scrollContainer: {
		justifyContent: "center",
		alignItems: "center",
		width: "100%",
	},
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
					<Text>loading</Text>
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
	const receiptsQuery = trpc.useQuery([
		"receipts.previews",
		{ offset: 0, limit: 10 },
	]);

	return (
		<Wrapper contentContainerStyle={styles.scrollContainer}>
			<ReceiptsScreenInner query={receiptsQuery} />
		</Wrapper>
	);
};
